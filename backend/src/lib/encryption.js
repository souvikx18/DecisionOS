// src/lib/encryption.js
// ============================================================
// AES-256-GCM Symmetric Field-Level Encryption
// Used to encrypt sensitive billing tokens and customer identifiers at rest.
// ============================================================

import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Derive a 32-byte encryption key from the environment secret
const ENCRYPTION_KEY = crypto.createHash('sha256').update(env.COOKIE_SECRET || 'decisionos_default_secure_key_2026').digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Output format: "enc:iv_hex:auth_tag_hex:ciphertext_hex"
 */
export function encrypt(text) {
  if (!text || typeof text !== 'string') return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string
 */
export function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.startsWith('enc:')) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) return encryptedText;

    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[Encryption] Failed to decrypt field:', err.message);
    return null;
  }
}

/**
 * Mask sensitive data (e.g. Card numbers or identifiers) for privacy-safe UI display
 */
export function maskIdentifier(str, visibleSuffixLength = 4) {
  if (!str || typeof str !== 'string') return '••••';
  if (str.length <= visibleSuffixLength) return '•••• ' + str;
  return '•••• ' + str.slice(-visibleSuffixLength);
}
