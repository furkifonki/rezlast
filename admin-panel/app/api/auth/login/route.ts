import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function redirectError(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL('/login?error=' + encodeURIComponent(message), request.url)
  );
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawNext = searchParams.get('next') ?? '/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';
  const formData = await request.formData();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return redirectError(request, 'E-posta ve şifre gerekli.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return redirectError(
      request,
      'Supabase ayarları eksik. admin-panel/.env.local dosyasında NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı olmalı. Sunucuyu yeniden başlatın.'
    );
  }

  const redirectUrl = new URL(next, request.url);
  const wantJson = request.headers.get('accept')?.includes('application/json');

  const response = wantJson
    ? NextResponse.json({ redirect: next }, { status: 200 })
    : NextResponse.redirect(redirectUrl);

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

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg =
        error.message === 'fetch failed'
          ? 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.'
          : 'Giriş başarısız. E-posta veya şifrenizi kontrol edin.';
      return wantJson
        ? NextResponse.json({ error: msg }, { status: 401 })
        : redirectError(request, msg);
    }
  } catch (e) {
    console.error('Login error:', e);
    const msg = 'Sunucu hatası. Lütfen tekrar deneyin.';
    return wantJson
      ? NextResponse.json({ error: msg }, { status: 500 })
      : redirectError(request, msg);
  }

  return response;
}
