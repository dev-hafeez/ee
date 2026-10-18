import { cache } from 'react';
import { createClient } from './server';

export interface CachedProfile {
  id: string;
  role: string;
  suspended: boolean;
  display_name: string | null;
  bio: string | null;
  timezone: string | null;
  benchmark_opt_in?: boolean | null;
}

/**
 * Deduplicated per-request server-side helper to fetch the current authenticated user.
 * React cache() ensures that whether Layout, Page, or Subcomponents call this in the
 * same render pass, only ONE network round-trip to Supabase Auth is made.
 */
export const getCachedAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Deduplicated per-request server-side helper to fetch the user's profile.
 * Layout and Pages share the exact same promise in the render pass.
 */
export const getCachedProfile = cache(async (userId: string): Promise<CachedProfile | null> => {
  if (!userId) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, suspended, display_name, bio, timezone, benchmark_opt_in')
    .eq('id', userId)
    .maybeSingle();

  return profile as CachedProfile | null;
});
