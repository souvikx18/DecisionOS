// src/middleware/rateLimit.middleware.js
// ============================================================
// Rate Limiting Middleware
// Uses express-rate-limit with a custom Redis-backed store.
// Each auth endpoint has its own dedicated limiter.
// ============================================================

import rateLimit from 'express-rate-limit';
import { getRedis } from '../config/redis.js';

// ── Redis Store for express-rate-limit ─────────────────────────
// Makes rate limits accurate across multiple server instances.
class RedisStore {
  constructor(prefix, windowMs) {
    this.prefix = prefix;
    this.windowSeconds = Math.ceil(windowMs / 1000);
  }

  async increment(key) {
    const redis = getRedis();
    const redisKey = `rl:${this.prefix}:${key}`;

    // Use a pipeline: INCR + EXPIRE atomically
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, this.windowSeconds, 'NX'); // NX = only set if not already set
    pipeline.ttl(redisKey);
    const results = await pipeline.exec();

    const totalHits = results[0][1];
    const ttl = results[2][1];
    const resetTime = new Date(Date.now() + ttl * 1000);

    return { totalHits, resetTime };
  }

  async decrement(key) {
    const redis = getRedis();
    await redis.decr(`rl:${this.prefix}:${key}`);
  }

  async resetKey(key) {
    const redis = getRedis();
    await redis.del(`rl:${this.prefix}:${key}`);
  }
}

// ── Helper to create a rate limiter ───────────────────────────
function createLimiter({ windowMs, max, prefix, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false,
    store: new RedisStore(prefix, windowMs),
    // No custom keyGenerator → uses built-in safe default (req.ip with IPv6 support)
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message || 'Too many requests. Please try again later.',
        },
        meta: {
          requestId: res.locals.requestId ?? null,
          timestamp: new Date().toISOString(),
          retryAfterSeconds: Math.ceil(windowMs / 1000),
        },
      });
    },
  });
}

// ── Per-endpoint Rate Limiters ─────────────────────────────────

// Signup: 5 per hour per IP
export const signupLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'signup',
  message: 'Too many signup attempts. Please try again in an hour.',
});

// Login: 10 per 15 minutes per IP
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'login',
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

// Email verification: 10 per hour per IP
export const verifyEmailLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: 'verify_email',
  message: 'Too many verification attempts. Please try again in an hour.',
});

// Resend verification: 3 per hour per IP
export const resendVerificationLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  prefix: 'resend_verify',
  message: 'Too many resend requests. Please try again in an hour.',
});

// Forgot password: 3 per hour per IP
export const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  prefix: 'forgot_pw',
  message: 'Too many password reset requests. Please try again in an hour.',
});

// Reset password: 5 per hour per IP
export const resetPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'reset_pw',
  message: 'Too many password reset attempts. Please try again in an hour.',
});

// Change password: 5 per hour per IP
export const changePasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'change_pw',
  message: 'Too many password change attempts. Please try again in an hour.',
});

// General auth endpoints: 60 per minute
export const authGeneralLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  prefix: 'auth_general',
  message: 'Too many requests. Please slow down.',
});

// Global: 200 per minute per IP (applied to all routes)
export const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 200,
  prefix: 'global',
  message: 'Too many requests from this IP. Please try again in a minute.',
});
