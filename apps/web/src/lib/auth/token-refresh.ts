import { decryptToken, encryptToken } from '@/lib/crypto/encryption';
import { getSocialProvider } from '@/lib/providers/social';
import { createAdminClient } from '@/lib/supabase/admin';

export async function refreshExpiringTokens(): Promise<{
  refreshed: number;
  failed: number;
}> {
  const supabase = createAdminClient();

  // Find accounts expiring within the next 7 days
  const soon = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select('id, user_id, platform, access_token_enc, token_expiry, handle')
    .eq('status', 'active')
    .lte('token_expiry', soon);

  if (error || !accounts) {
    return { refreshed: 0, failed: 0 };
  }

  let refreshedCount = 0;
  let failedCount = 0;

  for (const acc of accounts) {
    try {
      const decryptedToken = decryptToken(acc.access_token_enc);
      const provider = getSocialProvider(acc.platform as 'instagram' | 'facebook');
      const refreshed = await provider.refreshToken(decryptedToken);

      const newEncryptedToken = encryptToken(refreshed.accessToken);
      const newExpiry = refreshed.expiresIn
        ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
        : null;

      await supabase
        .from('social_accounts')
        .update({
          access_token_enc: newEncryptedToken,
          token_expiry: newExpiry,
        })
        .eq('id', acc.id);

      refreshedCount++;
    } catch {
      failedCount++;
      // Mark account needs_reauth and insert notification
      await supabase.from('social_accounts').update({ status: 'needs_reauth' }).eq('id', acc.id);

      await supabase.from('notifications').insert({
        user_id: acc.user_id,
        type: 'auth_warning',
        channel: 'in_app',
        message: `Your ${acc.platform} account (@${acc.handle}) connection has expired and requires re-authentication.`,
      });
    }
  }

  return { refreshed: refreshedCount, failed: failedCount };
}
