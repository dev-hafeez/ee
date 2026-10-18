import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getSafeSupabaseUrl, getSafeSupabaseAnonKey } from './config';

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = getSafeSupabaseUrl();
  const supabaseAnonKey = getSafeSupabaseAnonKey();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes the auth token if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected application routes
  const isProtectedAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/recommendations') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings');

  const isAdminRoute = pathname.startsWith('/admin');

  if (!user && (isProtectedAppRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated, check for suspension and admin permissions
  if (user) {
    const sessionCheckCookie = request.cookies.get('ee_session_check')?.value;
    const isSessionCheckValid = sessionCheckCookie === `${user.id}:ok`;

    // Always check for admin routes, but use short-lived cached cookie for standard navigation
    if (isAdminRoute || !isSessionCheckValid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, suspended')
        .eq('id', user.id)
        .single();

      if (profile?.suspended) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('error', 'suspended');
        supabaseResponse.cookies.delete('ee_session_check');
        return NextResponse.redirect(url);
      }

      if (isAdminRoute && profile?.role !== 'admin') {
        return new NextResponse('Forbidden: Administrator access required', { status: 403 });
      }

      // Cache validation for 60 seconds on standard navigation to avoid 500ms waterfalls
      supabaseResponse.cookies.set('ee_session_check', `${user.id}:ok`, {
        path: '/',
        maxAge: 60,
        httpOnly: true,
        sameSite: 'lax',
      });
    }
  }

  return supabaseResponse;
}
