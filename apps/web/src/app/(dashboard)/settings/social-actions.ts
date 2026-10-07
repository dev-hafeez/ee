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

  const userId = user?.id || '00000000-0000-0000-0000-000000000001';
  const dataMode = process.env.DATA_MODE || 'seed';

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
