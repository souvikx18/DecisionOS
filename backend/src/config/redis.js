// src/config/redis.js
// ============================================================
// Redis Client Singleton (ioredis)
// Used for: session storage, rate limiting, brute force counters,
//           pub/sub for real-time notifications, caching
// ============================================================

import Redis from 'ioredis';
import { env } from './env.js';

let redisClient = null;

function createRedisClient() {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Exponential backoff: 50ms, 100ms, 200ms... max 2s
      const delay = Math.min(times * 50, 2000);
      console.warn(`[Redis] Reconnecting... attempt ${times}, delay ${delay}ms`);
      return delay;
    },
    lazyConnect: false,
    enableOfflineQueue: true,
  });

  client.on('connect', () => {
    console.log('[Redis] ✅ Connected');
  });

  client.on('error', (err) => {
    console.error('[Redis] ❌ Error:', err.message);
  });

  client.on('close', () => {
    console.warn('[Redis] ⚠️  Connection closed');
  });

  return client;
}

export function getRedis() {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

// ── Convenience Helpers ────────────────────────────────────────

/**
 * Set a key with optional TTL (seconds)
 */
export async function redisSet(key, value, ttlSeconds = null) {
  const redis = getRedis();
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    return redis.set(key, serialized, 'EX', ttlSeconds);
  }
  return redis.set(key, serialized);
}

/**
 * Get and parse a key
 */
export async function redisGet(key) {
  const redis = getRedis();
  const value = await redis.get(key);
  if (!value) return null;
  return JSON.parse(value);
}

/**
 * Delete a key
 */
export async function redisDel(...keys) {
  const redis = getRedis();
  return redis.del(...keys);
}

/**
 * Increment a counter with TTL (for rate limiting / brute force)
 */
export async function redisIncr(key, ttlSeconds) {
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    // Set TTL only on first increment (don't reset on subsequent increments)
    await redis.expire(key, ttlSeconds);
  }
  return count;
}

/**
 * Check if key exists
 */
export async function redisExists(key) {
  const redis = getRedis();
  const result = await redis.exists(key);
  return result === 1;
}

/**
 * Health check — returns true if Redis responds
 */
export async function redisHealthCheck() {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
