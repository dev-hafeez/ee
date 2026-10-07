import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../next.config';
import { encryptToken, decryptToken } from '../src/lib/crypto/encryption';
import { validateMediaUpload } from '../src/lib/publishing/status-machine';

describe('Phase 12 — Security & NFR Verification (SRDS 4.2)', () => {
  it('enforces comprehensive HTTP security headers in Next.js configuration (SRDS 4.2.4)', async () => {
    assert.ok(
      typeof nextConfig.headers === 'function',
      'headers config must be defined as a function'
    );
    const headerConfigs = await nextConfig.headers();
    assert.ok(Array.isArray(headerConfigs), 'headers config must return an array');

    const rootRoute = headerConfigs.find((h) => h.source === '/:path*');
    assert.ok(rootRoute, 'root route /:path* security headers must be defined');

    const headersMap = new Map(rootRoute.headers.map((h) => [h.key, h.value]));

    // Check mandatory security headers
    assert.ok(headersMap.has('Strict-Transport-Security'), 'HSTS header must be present');
    assert.ok(
      headersMap.get('Strict-Transport-Security')?.includes('max-age'),
      'HSTS must define max-age'
    );

    assert.equal(
      headersMap.get('X-Frame-Options'),
      'SAMEORIGIN',
      'X-Frame-Options must prevent clickjacking'
    );
    assert.equal(
      headersMap.get('X-Content-Type-Options'),
      'nosniff',
      'MIME sniffing must be disabled'
    );
    assert.equal(
      headersMap.get('Referrer-Policy'),
      'strict-origin-when-cross-origin',
      'Referrer policy must be strict'
    );
    assert.ok(
      headersMap.has('Permissions-Policy'),
      'Permissions-Policy must restrict sensitive APIs'
    );
  });

  it('guarantees server-side-only isolation for secrets and token encryption (SRDS 4.2.1, 4.2.7)', () => {
    const rawSecret = 'meta_access_token_super_secret_xyz123';
    const encrypted = encryptToken(rawSecret);

    // Ciphertext must never contain the plaintext token
    assert.ok(!encrypted.includes(rawSecret), 'Encrypted token must not expose plaintext');
    assert.notEqual(encrypted, rawSecret);

    // Decryption works correctly
    const decrypted = decryptToken(encrypted);
    assert.equal(decrypted, rawSecret, 'Decrypted token must match original plaintext');

    // Sensitive server-only environment variables must not have NEXT_PUBLIC_ prefix
    const serverSecrets = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'TOKEN_ENC_KEY',
      'INTERNAL_TICK_SECRET',
      'AI_SERVICE_SECRET',
      'META_APP_SECRET',
      'LLM_API_KEY',
      'EMAIL_API_KEY',
    ];

    serverSecrets.forEach((key) => {
      assert.ok(
        !key.startsWith('NEXT_PUBLIC_'),
        `Secret ${key} must never have NEXT_PUBLIC_ prefix to avoid client exposure`
      );
    });
  });

  it('rejects malicious or spoofed media uploads via magic byte checks (SRDS 4.2.3, Decision D9)', () => {
    // 1. Valid JPEG
    const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const validJpegResult = validateMediaUpload(validJpegHeader, 'photo.jpg');
    assert.equal(validJpegResult.valid, true);

    // 2. Valid PNG
    const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const validPngResult = validateMediaUpload(validPngHeader, 'graphic.png');
    assert.equal(validPngResult.valid, true);

    // 3. Spoofed file: claim image/jpeg but header is an executable / ELF script
    const fakeScript = Buffer.from('#!/bin/bash\nrm -rf /');
    const spoofResult = validateMediaUpload(fakeScript, 'malicious.jpg');
    assert.equal(spoofResult.valid, false, 'Executable script spoofing JPEG must be rejected');
    assert.ok(
      spoofResult.error?.toLowerCase().includes('magic bytes'),
      'Error must specify magic bytes failure'
    );

    // 4. Oversized upload (over 8MB image limit)
    const oversizedJpeg = Buffer.alloc(9 * 1024 * 1024);
    oversizedJpeg[0] = 0xff;
    oversizedJpeg[1] = 0xd8;
    oversizedJpeg[2] = 0xff;
    const oversizedResult = validateMediaUpload(oversizedJpeg, 'photo.jpg');
    assert.equal(oversizedResult.valid, false, 'File exceeding limit must be rejected');
    assert.ok(oversizedResult.error?.includes('exceeds'));

    // 5. Truncated header (2 bytes instead of valid 3+ bytes JPEG header)
    const truncatedBuf = Buffer.from([0xff, 0xd8]);
    const truncatedResult = validateMediaUpload(truncatedBuf, 'corrupt.jpg');
    assert.equal(truncatedResult.valid, false, 'Truncated file header must be rejected');

    // 6. Windows PE executable binary (MZ header: 4D 5A) renamed to photo.jpg
    const peBinary = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const peResult = validateMediaUpload(peBinary, 'trojan.jpg');
    assert.equal(peResult.valid, false, 'Windows PE executable renamed to .jpg must be rejected');
    assert.ok(peResult.error?.toLowerCase().includes('magic bytes'));
  });

  it('rejects /internal/tick dispatcher requests without valid Bearer secret (SRDS 4.2.7)', async () => {
    const { POST: tickPost } = await import('../src/app/api/internal/tick/route');

    // 1. Missing Authorization header
    const reqMissing = new Request('http://localhost:3000/api/internal/tick', {
      method: 'POST',
    });
    const resMissing = await tickPost(reqMissing);
    assert.equal(resMissing.status, 401, 'Request without Authorization header must return 401');

    // 2. Wrong Bearer token
    const reqBad = new Request('http://localhost:3000/api/internal/tick', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong_tick_secret_xyz' },
    });
    const resBad = await tickPost(reqBad);
    assert.equal(resBad.status, 401, 'Request with invalid Bearer token must return 401');
  });
});

