import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase yapılandırması eksik.' }, { status: 500 });
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

  const { data, error } = await supabase
    .from('push_trigger_settings')
    .select('enabled, trigger_30min, trigger_1day')
    .eq('owner_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json(
      { error: error.message || 'Ayarlar okunamadı. push_trigger_settings tablosu mevcut mu?' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    data
      ? { enabled: !!data.enabled, trigger_30min: !!data.trigger_30min, trigger_1day: !!data.trigger_1day }
      : { enabled: true, trigger_30min: true, trigger_1day: false }
  );
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase yapılandırması eksik.' }, { status: 500 });
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

  let body: { enabled?: boolean; trigger_30min?: boolean; trigger_1day?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const enabled = typeof body.enabled === 'boolean' ? body.enabled : true;
  const trigger_30min = typeof body.trigger_30min === 'boolean' ? body.trigger_30min : true;
  const trigger_1day = typeof body.trigger_1day === 'boolean' ? body.trigger_1day : false;

  const { error: upsertErr } = await supabase
    .from('push_trigger_settings')
    .upsert(
      {
        owner_id: user.id,
        enabled,
        trigger_30min,
        trigger_1day,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id' }
    );

  if (upsertErr) {
    return NextResponse.json(
      { error: upsertErr.message || 'Ayarlar kaydedilemedi.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, enabled, trigger_30min, trigger_1day });
}
