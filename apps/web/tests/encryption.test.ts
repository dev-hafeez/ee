import assert from 'node:assert/strict';
import test from 'node:test';
import { encryptToken, decryptToken } from '../src/lib/crypto/encryption';

test('Phase 4 — AES-256-GCM Token Encryption (FR-07/08)', () => {
  const sampleToken = 'EAAGNO41x41gBAKz98jlkajsd982341908234lkjsd';

  // 1. Decrypt(Encrypt(x)) = x
  const encrypted1 = encryptToken(sampleToken);
  const decrypted1 = decryptToken(encrypted1);
  assert.equal(decrypted1, sampleToken, 'Decrypted token must exactly match original plaintext');

  // 2. Ciphertext differs per call due to random IV
  const encrypted2 = encryptToken(sampleToken);
  assert.notEqual(
    encrypted1,
    encrypted2,
    'Ciphertexts must differ across calls for the same plaintext due to random IV'
  );

  // Both decrypt to the same plaintext
  assert.equal(decryptToken(encrypted2), sampleToken);

  // 3. Format validation
  const parts = encrypted1.split(':');
  assert.equal(parts.length, 3, 'Encrypted format must be iv:ciphertext:tag');
  assert.equal(parts[0].length, 24, 'IV must be 12 bytes (24 hex characters)');
  assert.equal(parts[2].length, 32, 'GCM tag must be 16 bytes (32 hex characters)');

  // 4. Tampering detection
  const tampered = `${parts[0]}:deadbeef${parts[1].slice(8)}:${parts[2]}`;
  assert.throws(
    () => decryptToken(tampered),
    /Unsupported state or unable to authenticate data/,
    'Tampered ciphertext must fail GCM authentication tag verification'
  );
});
