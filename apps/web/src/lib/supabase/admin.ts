import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSafeSupabaseUrl } from './config';

// Server-only client with service_role privileges — NEVER import in client components
export function createAdminClient() {
  const supabaseUrl = getSafeSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key';

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
