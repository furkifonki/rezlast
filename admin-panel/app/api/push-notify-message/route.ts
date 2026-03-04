import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { setCorsHeaders, corsOptions } from '@/lib/cors';
import { rateLimit } from '@/lib/rateLimit';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function getSupabaseWithAuth(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (token) {
    return createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
  }
  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach((c) => response.cookies.set(c.name, c.value, c.options)),
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return corsOptions(request);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resForAuth = NextResponse.json({});
  setCorsHeaders(resForAuth, request);
  if (!supabaseUrl || !serviceKey) {
    return setCorsHeaders(NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 }), request);
  }
  const supabaseAuth = getSupabaseWithAuth(request, resForAuth);
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return setCorsHeaders(NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 }), request);
  }

  const rl = rateLimit(`notify-msg:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return setCorsHeaders(NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 }), request);
  }

  let body: { conversation_id?: string; sender_type?: string };
  try {
    body = await request.json();
  } catch {
    return setCorsHeaders(NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }), request);
  }
  const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id.trim() : null;
  const senderType = body.sender_type === 'user' || body.sender_type === 'restaurant' ? body.sender_type : null;
  if (!conversationId || !senderType) {
    return setCorsHeaders(NextResponse.json({ error: 'conversation_id ve sender_type gerekli.' }, { status: 400 }), request);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, user_id, restaurant_id')
    .eq('id', conversationId)
    .single();
  if (!conv) {
    return setCorsHeaders(NextResponse.json({ error: 'Sohbet bulunamadı.' }, { status: 404 }), request);
  }

  const isCustomer = conv.user_id === user.id;
  let isOwnerOrStaff = false;
  if (!isCustomer) {
    const { data: biz } = await supabase.from('businesses').select('owner_id').eq('id', conv.restaurant_id).single();
    if (biz?.owner_id === user.id) isOwnerOrStaff = true;
    if (!isOwnerOrStaff) {
      const { data: staffRow } = await supabase
        .from('restaurant_staff')
        .select('id')
        .eq('restaurant_id', conv.restaurant_id)
        .eq('user_id', user.id)
        .limit(1);
      if (staffRow?.length) isOwnerOrStaff = true;
    }
  }
  if (!isCustomer && !isOwnerOrStaff) {
    return setCorsHeaders(NextResponse.json({ error: 'Bu sohbete erişim yetkiniz yok.' }, { status: 403 }), request);
  }

  let businessName = 'İşletme';
  const { data: bizName } = await supabase.from('businesses').select('name').eq('id', conv.restaurant_id).single();
  if (bizName?.name) businessName = bizName.name;

  let title = 'Yeni mesaj';
  let bodyText: string;
  if (senderType === 'user') {
    const { data: res } = await supabase
      .from('conversations')
      .select('reservation_id')
      .eq('id', conversationId)
      .single();
    let customerName = 'Müşteri';
    if (res?.reservation_id) {
      const { data: rev } = await supabase.from('reservations').select('customer_name').eq('id', res.reservation_id).single();
      if (rev?.customer_name?.trim()) customerName = rev.customer_name.trim();
    }
    bodyText = `${customerName} size mesaj gönderdi.`;
  } else {
    bodyText = `${businessName} size bir mesaj gönderdi.`;
  }

  const recipientUserId = senderType === 'restaurant' ? conv.user_id : null;
  const recipientOwnerId = senderType === 'user' ? conv.restaurant_id : null;
  let targetUserIds: string[] = [];
  if (recipientUserId) {
    targetUserIds = [recipientUserId];
  } else if (recipientOwnerId) {
    const { data: biz } = await supabase.from('businesses').select('owner_id').eq('id', recipientOwnerId).single();
    if (biz?.owner_id) {
      const { data: triggerRow } = await supabase
        .from('push_trigger_settings')
        .select('notify_messages')
        .eq('owner_id', biz.owner_id)
        .single();
      if (triggerRow && triggerRow.notify_messages === false) {
        return setCorsHeaders(NextResponse.json({ ok: true }), request);
      }
      targetUserIds = [biz.owner_id];
    }
    const { data: staff } = await supabase.from('restaurant_staff').select('user_id').eq('restaurant_id', recipientOwnerId);
    if (staff) targetUserIds = [...new Set([...targetUserIds, ...(staff as { user_id: string }[]).map((s) => s.user_id)])];
  }

  const targetAppType = senderType === 'user' ? 'owner' : 'customer';
  for (const uid of targetUserIds) {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', uid)
      .or(`app_type.eq.${targetAppType},app_type.is.null`)
      .not('expo_push_token', 'is', null);
    const list = (tokens ?? []).map((t: { expo_push_token: string }) => t.expo_push_token).filter(Boolean);
    if (list.length > 0) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list.map((to: string) => ({ to, title, body: bodyText, sound: 'default' }))),
      });
    }
  }
  return setCorsHeaders(NextResponse.json({ ok: true }), request);
}
