import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptToken, encryptToken } from '../src/lib/crypto/encryption';
import { getSocialProvider, MockProvider } from '../src/lib/providers/social';

test('Phase 4 — Social Account Connection in Mock Mode (FR-07, FR-08, UC02)', async () => {
  const provider = getSocialProvider('instagram');
  assert.ok(provider instanceof MockProvider, 'Default mode should instantiate MockProvider');

  // Exchange code
  const auth = await provider.exchangeCode('test_code_123');
  assert.equal(auth.handle, 'alex_rivers_creative');
  assert.equal(auth.externalId, 'mock_instagram_acc_001');
  assert.ok(auth.accessToken.length > 0);

  // Encrypt token
  const encryptedToken = encryptToken(auth.accessToken);
  assert.notEqual(encryptedToken, auth.accessToken, 'Encrypted token must never match raw token');

  // Verify format iv:ciphertext:tag
  const parts = encryptedToken.split(':');
  assert.equal(parts.length, 3);

  // Decrypt token
  const decrypted = decryptToken(encryptedToken);
  assert.equal(decrypted, auth.accessToken);
});

test('Phase 4 — Token Refresh Flow', async () => {
  const provider = new MockProvider('instagram');
  const initial = await provider.exchangeCode('code');
  const refreshed = await provider.refreshToken(initial.accessToken);

  assert.ok(refreshed.accessToken.includes('refreshed'));
  assert.ok(typeof refreshed.expiresIn === 'number');
});

test('Phase 4 — Business Discovery Public Data Only (D7)', async () => {
  const provider = new MockProvider('instagram');
  const compData = await provider.businessDiscovery('token', 'own_acc', 'target_creator');

  assert.equal(compData.handle, 'target_creator');
  assert.ok(compData.followersCount > 0);
  assert.ok(compData.mediaCount > 0);

  // Verify competitor view does not leak private reach/impressions
  if (compData.recentPosts && compData.recentPosts.length > 0) {
    const post = compData.recentPosts[0];
    assert.ok('likes' in post);
    assert.ok('comments' in post);
    assert.ok(
      !('reach' in post),
      'Competitor data must not contain private reach metrics (SRDS D7)'
    );
    assert.ok(
      !('impressions' in post),
      'Competitor data must not contain private impressions (SRDS D7)'
    );
  }
});
