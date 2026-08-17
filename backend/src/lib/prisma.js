// src/lib/prisma.js
// ============================================================
// Prisma Client with RLS Middleware
//
// Before every query, this sets:
//   app.current_org_id  → enforces organization isolation
//   app.current_user_id → enforces user isolation
//
// These values are read by the RLS policies on every table.
// ============================================================

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// Global singleton — reuse across requests
const globalThis_prisma = globalThis.__prisma;

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

  // ── RLS Context Middleware ─────────────────────────────────
  // This runs BEFORE every Prisma query.
  // It wraps the query in a transaction that sets the RLS context.
  client.$use(async (params, next) => {
    // Get current RLS context from AsyncLocalStorage (set per-request)
    const orgId = getRLSContext('orgId');
    const userId = getRLSContext('userId');

    // If no context set (e.g. seed scripts, migrations) → run normally
    if (!orgId && !userId) {
      return next(params);
    }

    // Wrap query in a transaction with SET LOCAL to scope RLS vars
    return client.$transaction(async (tx) => {
      if (orgId) {
        await tx.$executeRawUnsafe(
          `SET LOCAL app.current_org_id = '${orgId}'`
        );
      }
      if (userId) {
        await tx.$executeRawUnsafe(
          `SET LOCAL app.current_user_id = '${userId}'`
        );
      }
      return next(params);
    });
  });

  return client;
}

export const prisma = globalThis_prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}


// ============================================================
// RLS Context Store (AsyncLocalStorage)
// Stores per-request orgId and userId without polluting globals
// ============================================================

import { AsyncLocalStorage } from 'node:async_hooks';

const rlsStorage = new AsyncLocalStorage();

/**
 * Run a callback with RLS context set.
 * Use this in your request handler to scope all DB queries.
 *
 * @example
 * app.use(authMiddleware);
 * app.use((req, res, next) => {
 *   withRLSContext({ orgId: req.org.id, userId: req.user.id }, next);
 * });
 */
export function withRLSContext({ orgId, userId }, callback) {
  return rlsStorage.run({ orgId, userId }, callback);
}

/**
 * Get a value from the current RLS context.
 * Returns undefined if called outside withRLSContext.
 */
function getRLSContext(key) {
  const store = rlsStorage.getStore();
  return store?.[key];
}
