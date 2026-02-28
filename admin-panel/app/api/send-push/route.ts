import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase yapılandırması eksik.' },
      { status: 500 }
    );
  }

  const response = NextResponse.json({});
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  }

  let body: { title?: string; body?: string; mode?: string; user_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'Başlık gerekli.' }, { status: 400 });
  }
  const messageBody = typeof body.body === 'string' ? body.body.trim() : title;
  const mode = typeof body.mode === 'string' && body.mode === 'single' ? 'single' : 'bulk';
  const targetUserId = mode === 'single' && typeof body.user_id === 'string' ? body.user_id.trim() : null;

  let query = supabase
    .from('push_tokens')
    .select('expo_push_token')
    .not('expo_push_token', 'is', null);
  if (mode === 'single' && targetUserId) {
    query = query.eq('user_id', targetUserId);
  }
  const { data: tokens, error: fetchErr } = await query;
  if (fetchErr) {
    return NextResponse.json(
      { error: fetchErr.message || 'Token listesi alınamadı.' },
      { status: 500 }
    );
  }
  const list = (tokens ?? [])
    .map((t: { expo_push_token: string }) => t.expo_push_token)
    .filter(Boolean);
  const total = list.length;
  if (total === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 });
  }

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const chunk = list.slice(i, i + BATCH_SIZE);
    const messages = chunk.map((to: string) => ({
      to,
      title,
      body: messageBody,
      sound: 'default' as const,
    }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      failed += chunk.length;
      continue;
    }
    const data = (await res.json()) as { data?: { status: string }[] };
    (data.data ?? []).forEach((d: { status?: string }) => {
      if (d.status === 'ok') sent += 1;
      else failed += 1;
    });
  }

  return NextResponse.json({ sent, failed, total });
}
