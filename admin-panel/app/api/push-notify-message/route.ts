import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

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

export async function POST(request: NextRequest) {
  const response = NextResponse.json({});
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 });
  }
  const supabaseAuth = getSupabaseWithAuth(request, response);
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  }
  let body: { conversation_id?: string; sender_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }
  const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id.trim() : null;
  const senderType = body.sender_type === 'user' || body.sender_type === 'restaurant' ? body.sender_type : null;
  if (!conversationId || !senderType) {
    return NextResponse.json({ error: 'conversation_id ve sender_type gerekli.' }, { status: 400 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, user_id, restaurant_id')
    .eq('id', conversationId)
    .single();
  if (!conv) {
    return NextResponse.json({ error: 'Sohbet bulunamadı.' }, { status: 404 });
  }
  let businessName = 'İşletme';
  const { data: bizName } = await supabase.from('businesses').select('name').eq('id', conv.restaurant_id).single();
  if (bizName?.name) businessName = bizName.name;
  const recipientUserId = senderType === 'restaurant' ? conv.user_id : null;
  const recipientOwnerId = senderType === 'user' ? conv.restaurant_id : null;
  let targetUserIds: string[] = [];
  if (recipientUserId) {
    targetUserIds = [recipientUserId];
  } else if (recipientOwnerId) {
    const { data: biz } = await supabase.from('businesses').select('owner_id').eq('id', recipientOwnerId).single();
    if (biz?.owner_id) targetUserIds = [biz.owner_id];
    const { data: staff } = await supabase.from('restaurant_staff').select('user_id').eq('restaurant_id', recipientOwnerId);
    if (staff) targetUserIds = [...new Set([...targetUserIds, ...(staff as { user_id: string }[]).map((s) => s.user_id)])];
  }
  const title = 'Yeni mesaj';
  const bodyText = `${businessName} size bir mesaj gönderdi.`;
  for (const uid of targetUserIds) {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', uid)
      .not('expo_push_token', 'is', null);
    const list = (tokens ?? []).map((t: { expo_push_token: string }) => t.expo_push_token).filter(Boolean);
    if (list.length > 0) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list.map((to: string) => ({ to, title, body: bodyText, sound: 'default' }))),
      });
    }
    await supabase.from('app_notifications').insert({
      user_id: uid,
      type: 'new_message',
      title,
      body: bodyText,
      data_conversation_id: conversationId,
    });
  }
  return NextResponse.json({ ok: true });
}
