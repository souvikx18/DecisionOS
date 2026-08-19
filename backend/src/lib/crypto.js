// src/lib/crypto.js
// ============================================================
// Cryptographic Utilities
// All token generation and hashing is centralised here.
// Uses Node.js built-in crypto module (no external deps).
//
// Rules:
//  - All tokens: CSPRNG via crypto.randomBytes()
//  - All stored tokens: SHA-256 hashed before DB storage
//  - Raw token goes to user (email link) ONLY — never stored
// ============================================================

import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Generate a cryptographically secure random token
 * Default: 32 bytes → 64 hex characters
 */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a raw token with SHA-256 before storing in DB.
 * If the DB is breached, the stored hash is useless to attackers.
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Timing-safe string comparison.
 * Prevents timing attacks when comparing tokens/secrets.
 */
export function timingSafeEqual(a, b) {
  // Pad to same length (timingSafeEqual requires equal-length buffers)
  const aBuffer = Buffer.from(a.padEnd(64), 'utf8');
  const bBuffer = Buffer.from(b.padEnd(64), 'utf8');
  try {
    return crypto.timingSafeEqual(aBuffer, bBuffer) && a.length === b.length;
  } catch {
    return false;
  }
}

/**
 * Cookie options for session cookie.
 * Applies full security flags.
 */
export function getSessionCookieOptions(ttlSeconds) {
  return {
    httpOnly: true,                   // JS cannot read → XSS protection
    secure: env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',               // Never sent cross-site → CSRF protection
    maxAge: ttlSeconds * 1000,        // Convert seconds to milliseconds
    path: '/',
  };
}

/**
 * Cookie options to clear a session cookie (expire it immediately)
 */
export function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  };
}

/**
 * Generate a future expiry Date object
 * @param {number} seconds - Seconds from now
 */
export function expiresAt(seconds) {
  return new Date(Date.now() + seconds * 1000);
}
