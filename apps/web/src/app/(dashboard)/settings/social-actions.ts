'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { encryptToken } from '@/lib/crypto/encryption';
import { getSocialProvider, SocialPlatform } from '@/lib/providers/social';
import { createClient } from '@/lib/supabase/server';

export async function connectSocialAccount(platform: SocialPlatform) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to connect accounts.' };
  }

  const userId = user.id;
  const dataMode = process.env.DATA_MODE || 'seed';

  // Safety net: verify profile row exists before inserting social_accounts
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existingProfile) {
    // Attempt server-side safety net profile provisioning
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      'User';

    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          display_name: displayName,
          role: 'user',
          timezone: 'UTC',
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      return {
        error: `User profile is missing and could not be provisioned: ${profileError.message}. Please complete profile setup before connecting social accounts.`,
      };
    }

    // Also ensure notification preferences exist
    await admin
      .from('notification_preferences')
      .upsert({ user_id: userId }, { onConflict: 'user_id' });
  }

  if (dataMode === 'mock' || dataMode === 'seed') {
    // Mock / seed connection: generate credentials and encrypt
    const provider = getSocialProvider(platform);
    const mockAuth = await provider.exchangeCode('mock_oauth_code_xyz');

    const encryptedToken = encryptToken(mockAuth.accessToken);

    const { error } = await supabase.from('social_accounts').upsert(
      {
        user_id: userId,
        platform,
        external_id: mockAuth.externalId,
        handle: mockAuth.handle,
        access_token_enc: encryptedToken,
        status: 'active',
        is_synthetic: dataMode === 'seed',
        last_sync: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform,external_id' }
    );

    if (error) {
      if (error.code === '23503' || error.message?.includes('social_accounts_user_id_fkey')) {
        return {
          error:
            'User profile does not exist in the database (FK violation: social_accounts_user_id_fkey). Please ensure your profile is initialized before connecting accounts.',
        };
      }
      return { error: error.message };
    }

    revalidatePath('/settings');
    return { success: true, handle: mockAuth.handle };
  }

  // Live Meta OAuth
  const provider = getSocialProvider(platform);
  const state = Buffer.from(JSON.stringify({ userId, platform, nonce: Date.now() })).toString(
    'base64'
  );
  const authUrl = provider.getAuthUrl(state);

  redirect(authUrl);
}

export async function disconnectSocialAccount(accountId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('social_accounts').delete().eq('id', accountId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  return { success: true };
}
