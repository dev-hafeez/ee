import { NextRequest, NextResponse } from 'next/server';
import { encryptToken } from '@/lib/crypto/encryption';
import { getSocialProvider } from '@/lib/providers/social';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateStr = searchParams.get('state');
  const error = searchParams.get('error');

  const origin = request.nextUrl.origin;

  if (error || !code) {
    const errorMsg =
      searchParams.get('error_description') || 'OAuth authorization was cancelled or failed.';
    return NextResponse.redirect(`${origin}/settings?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    let userId = '';
    if (stateStr) {
      try {
        const decoded = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf8'));
        userId = decoded.userId;
      } catch {
        // Fallback
      }
    }

    if (!userId) {
      return NextResponse.redirect(`${origin}/settings?error=Invalid+OAuth+state`);
    }

    const provider = getSocialProvider('instagram');
    const authData = await provider.exchangeCode(code);

    // Encrypt token with AES-256-GCM before writing to database
    const encryptedToken = encryptToken(authData.accessToken);

    const supabase = createAdminClient();
    const tokenExpiry = authData.expiresIn
      ? new Date(Date.now() + authData.expiresIn * 1000).toISOString()
      : null;

    const { error: dbError } = await supabase.from('social_accounts').upsert(
      {
        user_id: userId,
        platform: 'instagram',
        external_id: authData.externalId,
        handle: authData.handle,
        access_token_enc: encryptedToken,
        token_expiry: tokenExpiry,
        status: 'active',
        is_synthetic: false,
        last_sync: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform,external_id' }
    );

    if (dbError) {
      return NextResponse.redirect(
        `${origin}/settings?error=${encodeURIComponent(dbError.message)}`
      );
    }

    return NextResponse.redirect(`${origin}/settings?success=connected`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to connect Instagram account';
    return NextResponse.redirect(`${origin}/settings?error=${encodeURIComponent(message)}`);
  }
}
