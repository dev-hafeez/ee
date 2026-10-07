import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const TAG_LENGTH = 16; // Standard 128-bit authentication tag

function getEncryptionKey(): Buffer {
  const keyEnv = process.env.TOKEN_ENC_KEY;
  if (!keyEnv) {
    // Deterministic fallback for mock/local development if env var not set
    return crypto.scryptSync('entangled-echo-dev-fallback-key', 'salt', 32);
  }

  // Key can be base64-encoded 32 bytes or raw 32-char string
  const buf = Buffer.from(keyEnv, 'base64');
  if (buf.length === 32) {
    return buf;
  }
  const utfBuf = Buffer.from(keyEnv, 'utf-8');
  if (utfBuf.length === 32) {
    return utfBuf;
  }

  return crypto.scryptSync(keyEnv, 'salt', 32);
}

/**
 * Encrypts sensitive tokens with AES-256-GCM.
 * Each call generates a fresh, random 12-byte initialization vector (IV),
 * ensuring ciphertext differs on every call for the same plaintext.
 * Returns formatted string: `${iv_hex}:${ciphertext_hex}:${tag_hex}`
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decrypts tokens previously encrypted with AES-256-GCM.
 * Validates integrity via GCM authentication tag.
 */
export function decryptToken(encryptedPayload: string): string {
  const key = getEncryptionKey();
  const parts = encryptedPayload.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format: expected iv:ciphertext:tag');
  }

  const [ivHex, ciphertextHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  if (tag.length !== TAG_LENGTH) {
    throw new Error('Invalid authentication tag length');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
