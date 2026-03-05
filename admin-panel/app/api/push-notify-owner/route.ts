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

  const rl = rateLimit(`notify-owner:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return setCorsHeaders(NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 }), request);
  }

  let body: { business_id?: string; reservation_id?: string };
  try {
    body = await request.json();
  } catch {
    return setCorsHeaders(NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }), request);
  }
  const businessId = typeof body.business_id === 'string' ? body.business_id.trim() : null;
  if (!businessId) {
    return setCorsHeaders(NextResponse.json({ error: 'business_id gerekli.' }, { status: 400 }), request);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: business } = await supabase.from('businesses').select('id, name, owner_id').eq('id', businessId).single();
  if (!business?.owner_id) {
    return setCorsHeaders(NextResponse.json({ error: 'İşletme bulunamadı.' }, { status: 404 }), request);
  }
  const { data: triggerRow } = await supabase
    .from('push_trigger_settings')
    .select('notify_reservations')
    .eq('owner_id', business.owner_id)
    .single();
  if (triggerRow && triggerRow.notify_reservations === false) {
    return setCorsHeaders(NextResponse.json({ ok: true }), request);
  }
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', business.owner_id)
    .eq('app_type', 'owner')
    .not('expo_push_token', 'is', null);
  const list = (tokens ?? []).map((t: { expo_push_token: string }) => t.expo_push_token).filter(Boolean);
  const title = 'Yeni rezervasyon';
  const bodyText = `${business.name} için yeni bir rezervasyon oluşturuldu.`;
  if (list.length > 0) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list.map((to: string) => ({ to, title, body: bodyText, sound: 'default' }))),
    });
  }
  return setCorsHeaders(NextResponse.json({ ok: true }), request);
}
