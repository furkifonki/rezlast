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

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim()?.toLowerCase() || '';

  const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
  const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
  if (businessIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: rows } = await supabase
    .from('reservations')
    .select('user_id, customer_name')
    .in('business_id', businessIds)
    .in('status', ['pending', 'confirmed']);

  const byUser = new Map<string, string>();
  (rows ?? []).forEach((r: { user_id: string; customer_name: string | null }) => {
    if (r.user_id && !byUser.has(r.user_id)) {
      byUser.set(r.user_id, r.customer_name?.trim() || `Müşteri ${r.user_id.slice(0, 8)}`);
    }
  });

  let list = Array.from(byUser.entries()).map(([user_id, label]) => ({ user_id, label }));
  if (q) {
    list = list.filter((c) => c.label.toLowerCase().includes(q));
  }
  return NextResponse.json(list);
}
