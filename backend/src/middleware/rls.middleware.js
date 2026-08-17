// src/middleware/rls.middleware.js
// ============================================================
// RLS Context Middleware
//
// This must be placed AFTER your auth middleware.
// It activates RLS scoping for every database query
// made during the request lifecycle.
//
// Usage in app.js / server.js:
//   import { rlsMiddleware } from './middleware/rls.middleware.js';
//   app.use(authMiddleware);         // sets req.user + req.org
//   app.use(rlsMiddleware);          // activates RLS context
// ============================================================

import { withRLSContext } from '../lib/prisma.js';

/**
 * Express middleware that wraps each request in an RLS context.
 * All Prisma queries made during this request will automatically
 * have app.current_org_id and app.current_user_id set in PostgreSQL.
 */
export function rlsMiddleware(req, res, next) {
  const orgId = req.org?.id ?? null;
  const userId = req.user?.id ?? null;

  // Wrap the rest of the request in RLS context
  withRLSContext({ orgId, userId }, next);
}
