import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // Session'ı güncelle (refresh token vb.); cookie'ler response'a yazılır
  const { data: { user } } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === '/login';
  const isRegisterPage = request.nextUrl.pathname === '/register';
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboard && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if ((isLoginPage || isRegisterPage) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/login', '/register', '/dashboard/:path*'],
};
