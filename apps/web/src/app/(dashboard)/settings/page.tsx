import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCachedAuthUser, getCachedProfile } from '@/lib/supabase/cached';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCachedAuthUser();

  if (!user) {
    redirect('/login?redirectTo=/settings');
  }

  const supabase = await createClient();

  // Fetch cached user profile and social accounts in parallel
  const [profile, { data: accounts }] = await Promise.all([
    getCachedProfile(user.id),
    supabase
      .from('social_accounts')
      .select('id, platform, handle, status')
      .eq('user_id', user.id),
  ]);

  const ig = accounts?.find((a) => a.platform === 'instagram');
  const fb = accounts?.find((a) => a.platform === 'facebook');

  const initialProfile = {
    displayName: profile?.display_name || '',
    bio: profile?.bio || '',
    timezone: profile?.timezone || 'UTC',
    email: user.email || '',
    benchmarkOptIn: profile?.benchmark_opt_in ?? false,
  };

  const initialAccounts = {
    instagram: {
      connected: !!ig && ig.status === 'active',
      handle: ig?.handle || null,
      id: ig?.id || null,
    },
    facebook: {
      connected: !!fb && fb.status === 'active',
      handle: fb?.handle || null,
      id: fb?.id || null,
    },
  };

  return <SettingsClient initialProfile={initialProfile} initialAccounts={initialAccounts} />;
}
