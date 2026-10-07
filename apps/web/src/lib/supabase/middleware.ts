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
    // In mock/seed offline mode with placeholder supabase, allow development preview if DATA_MODE is mock/seed
    const dataMode = process.env.DATA_MODE || 'seed';
    const isPlaceholderSupabase =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isPlaceholderSupabase && (dataMode === 'mock' || dataMode === 'seed')) {
      // In offline mock mode without live Supabase credentials, pass through for UI development
      return supabaseResponse;
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated, check for suspension and admin permissions
  if (user) {
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
      return NextResponse.redirect(url);
    }

    if (isAdminRoute && profile?.role !== 'admin') {
      return new NextResponse('Forbidden: Administrator access required', { status: 403 });
    }
  }

  return supabaseResponse;
}
