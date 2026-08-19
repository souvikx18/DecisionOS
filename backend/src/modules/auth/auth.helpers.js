// src/modules/auth/auth.helpers.js
// ============================================================
// Auth-specific helpers for session management
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { redisSet, redisDel, redisGet, getRedis } from '../../config/redis.js';
import { generateToken, getSessionCookieOptions, getClearCookieOptions, expiresAt } from '../../lib/crypto.js';
import { env } from '../../config/env.js';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = env.SESSION_TTL_SECONDS;

// ── Session Creation ───────────────────────────────────────────

/**
 * Create a new session for a user:
 * 1. Generate CSPRNG token
 * 2. Write to Redis (fast lookup)
 * 3. Write to DB (durable + session listing)
 * 4. Set HttpOnly cookie on response
 */
export async function createSession(res, user, req) {
  const token = generateToken(32); // 64-char hex string

  // Payload stored in Redis for fast per-request lookup
  const sessionPayload = {
    userId: user.id,
    email: user.email,
  };

  // Write to Redis with TTL
  await redisSet(`${SESSION_PREFIX}${token}`, sessionPayload, SESSION_TTL);

  // Write to DB for session listing and durability
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      expiresAt: expiresAt(SESSION_TTL),
    },
  });

  // Set the cookie
  res.cookie('session', token, getSessionCookieOptions(SESSION_TTL));

  return token;
}

/**
 * Destroy a specific session by token.
 * Removes from Redis immediately (instant revocation) + DB.
 */
export async function destroySession(res, token) {
  // Delete from Redis immediately
  await redisDel(`${SESSION_PREFIX}${token}`);

  // Delete from DB
  await prisma.session.deleteMany({ where: { token } });

  // Clear the cookie
  res.clearCookie('session', getClearCookieOptions());
}

/**
 * Destroy ALL sessions for a user.
 * Used on password reset or "logout everywhere".
 */
export async function destroyAllUserSessions(res, userId) {
  // Get all session tokens for this user from DB
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: { token: true },
  });

  // Delete all from Redis in one pipeline
  if (sessions.length > 0) {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    sessions.forEach((s) => pipeline.del(`${SESSION_PREFIX}${s.token}`));
    await pipeline.exec();
  }

  // Delete all from DB
  await prisma.session.deleteMany({ where: { userId } });

  // Clear cookie
  if (res) res.clearCookie('session', getClearCookieOptions());
}

/**
 * Look up a session by token.
 * Checks Redis first (fast), falls back to DB (durable).
 * Re-caches in Redis if found only in DB (e.g. after Redis restart).
 */
export async function getSession(token) {
  if (!token) return null;

  // 1. Try Redis first
  const cached = await redisGet(`${SESSION_PREFIX}${token}`);
  if (cached) return cached;

  // 2. Fallback to DB
  const dbSession = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, isSuperAdmin: true } } },
  });

  if (!dbSession || dbSession.expiresAt < new Date()) {
    return null; // Expired or not found
  }

  // 3. Re-cache in Redis
  const payload = { userId: dbSession.user.id, email: dbSession.user.email };
  const remainingTtl = Math.floor((dbSession.expiresAt - Date.now()) / 1000);
  if (remainingTtl > 0) {
    await redisSet(`${SESSION_PREFIX}${token}`, payload, remainingTtl);
  }

  return payload;
}
