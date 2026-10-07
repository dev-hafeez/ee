import { createBrowserClient } from '@supabase/ssr';
import { getSafeSupabaseUrl, getSafeSupabaseAnonKey } from './config';

export function createClient() {
  const supabaseUrl = getSafeSupabaseUrl();
  const supabaseAnonKey = getSafeSupabaseAnonKey();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
