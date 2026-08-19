// src/middleware/auth.middleware.js
// ============================================================
// Authentication Middleware
// Validates the session cookie on every protected route.
// Attaches req.user to the request if session is valid.
// ============================================================

import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/response.js';
import { getSession } from '../modules/auth/auth.helpers.js';

/**
 * requireAuth — protects routes that need a logged-in user.
 *
 * Flow:
 * 1. Read 'session' cookie
 * 2. Look up in Redis (fast) → fallback DB
 * 3. Fetch full user from DB
 * 4. Attach req.user = { id, email, firstName, lastName, ... }
 * 5. Next() if valid, 401 if not
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = req.cookies?.session || req.signedCookies?.session || bearerToken;

    if (!token) {
      return sendError(res, 401, 'UNAUTHORIZED', 'You must be logged in to access this resource.');
    }

    // Look up session (Redis first, then DB)
    const sessionPayload = await getSession(token);

    if (!sessionPayload) {
      return sendError(res, 401, 'SESSION_EXPIRED', 'Your session has expired. Please log in again.');
    }

    // Fetch full user from DB
    const user = await prisma.user.findUnique({
      where: { id: sessionPayload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isEmailVerified: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return sendError(res, 401, 'USER_NOT_FOUND', 'Account not found. Please log in again.');
    }

    // Attach user to request for downstream middleware and controllers
    req.user = user;
    req.sessionToken = token;

    next();
  } catch (err) {
    console.error('[Auth Middleware] Error:', err.message);
    return sendError(res, 500, 'SERVER_ERROR', 'An internal error occurred.');
  }
}

/**
 * requireSuperAdmin — restricts routes to super admins only.
 * Must be used AFTER requireAuth.
 */
export function requireSuperAdmin(req, res, next) {
  if (!req.user?.isSuperAdmin) {
    return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to access this resource.');
  }
  next();
}

/**
 * optionalAuth — attaches user if logged in, but does not block if not.
 * Useful for public routes that show extra data when authenticated.
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = req.cookies?.session || req.signedCookies?.session || bearerToken;
    if (!token) return next();

    const sessionPayload = await getSession(token);
    if (!sessionPayload) return next();

    const user = await prisma.user.findUnique({
      where: { id: sessionPayload.userId },
      select: { id: true, email: true, firstName: true, lastName: true, isSuperAdmin: true },
    });

    if (user) req.user = user;
    next();
  } catch {
    next(); // Never block on optional auth failure
  }
}
