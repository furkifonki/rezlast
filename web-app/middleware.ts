import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data?.user ?? null;
    const isAppRoute = request.nextUrl.pathname.startsWith('/app');
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register') ||
      request.nextUrl.pathname.startsWith('/forgot-password');

    if (isAppRoute && !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  } catch {
    // auth check failed, let request through
  }

  return response;
}

export const config = {
  matcher: ['/app/:path*', '/login', '/register', '/forgot-password'],
};
