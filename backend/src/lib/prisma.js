import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import 'dotenv/config';

// Global singleton — reuse across hot reloads & requests
const globalThis_prisma = globalThis.__prisma;

// ============================================================
// RLS Context Store (AsyncLocalStorage)
// Stores per-request orgId and userId without polluting globals
// ============================================================

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

/**
 * Creates a Prisma client with modern Client Extensions ($extends)
 * replacing the deprecated client.$use middleware.
 */
function createPrismaClient() {
  const baseClient = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

  // ── RLS Context Extension ───────────────────────────────────
  // Modern replacement for deprecated client.$use()
  // Scopes queries with PostgreSQL SET LOCAL session variables
  const extendedClient = baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const orgId = getRLSContext('orgId');
          const userId = getRLSContext('userId');

          // If no context set (e.g. seed scripts, migrations, tests) → run normally
          if (!orgId && !userId) {
            return query(args);
          }

          // Wrap query in a transaction with SET LOCAL to scope PostgreSQL RLS vars
          return baseClient.$transaction(async (tx) => {
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
            return query(args);
          });
        },
      },
    },
  });

  return extendedClient;
}

export const prisma = globalThis_prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
