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
  let body: { reservation_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }
  const reservationId = typeof body.reservation_id === 'string' ? body.reservation_id.trim() : null;
  if (!reservationId) {
    return NextResponse.json({ error: 'reservation_id gerekli.' }, { status: 400 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: res } = await supabase
    .from('reservations')
    .select('id, user_id, businesses ( name )')
    .eq('id', reservationId)
    .single();
  if (!res?.user_id) {
    return NextResponse.json({ error: 'Rezervasyon bulunamadı.' }, { status: 404 });
  }
  const businessName = (res.businesses as { name?: string } | null)?.name ?? 'İşletme';
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', res.user_id)
    .not('expo_push_token', 'is', null);
  const list = (tokens ?? []).map((t: { expo_push_token: string }) => t.expo_push_token).filter(Boolean);
  const title = 'Rezervasyon onaylandı';
  const bodyText = `${businessName} rezervasyonunuz onaylandı.`;
  if (list.length > 0) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list.map((to: string) => ({ to, title, body: bodyText, sound: 'default' }))),
    });
  }
  await supabase.from('app_notifications').insert({
    user_id: res.user_id,
    type: 'reservation_confirmed',
    title,
    body: bodyText,
    data_reservation_id: reservationId,
  });
  return NextResponse.json({ ok: true });
}
