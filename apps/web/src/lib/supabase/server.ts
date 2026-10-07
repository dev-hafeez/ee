import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSafeSupabaseUrl, getSafeSupabaseAnonKey } from './config';

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2];
};

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = getSafeSupabaseUrl();
  const supabaseAnonKey = getSafeSupabaseAnonKey();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
