// src/middleware/org.middleware.js
// ============================================================
// Organization Context Middleware
//
// Runs AFTER requireAuth. Resolves which organization the current
// user is operating in and attaches org + member info to req.
//
// Active org is determined by (in order):
//   1. X-Organization-ID request header  (multi-org API clients)
//   2. User's first membership           (single-org users)
//
// Sets:
//   req.org    = { id, name, slug, status, currency, timezone, logoUrl }
//   req.member = { id, role, userId, organizationId }
// ============================================================

import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/response.js';

/**
 * requireOrg middleware.
 * Must be placed AFTER requireAuth.
 */
export async function requireOrg(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required.');
    }

    // Determine org ID from header or first membership
    const headerOrgId = req.headers['x-organization-id'];

    let membership;

    if (headerOrgId) {
      // Look for membership in the specified org
      membership = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: headerOrgId, userId } },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              industry: true,
              timezone: true,
              currency: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    } else {
      // No header — pick the first org this user belongs to
      membership = await prisma.organizationMember.findFirst({
        where: { userId },
        orderBy: { joinedAt: 'asc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              industry: true,
              timezone: true,
              currency: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    }

    if (!membership) {
      return sendError(
        res, 403, 'NO_ORGANIZATION',
        'You are not a member of any organization. Please create or join one.'
      );
    }

    const org = membership.organization;

    // Check organization is active
    if (org.status === 'DELETED') {
      return sendError(res, 410, 'ORG_DELETED', 'This organization has been deleted.');
    }

    if (org.status === 'SUSPENDED') {
      return sendError(
        res, 403, 'ORG_SUSPENDED',
        'This organization has been suspended. Please contact support.'
      );
    }

    // Attach to request
    req.org = org;
    req.member = {
      id: membership.id,
      role: membership.role,
      userId: membership.userId,
      organizationId: membership.organizationId,
      joinedAt: membership.joinedAt,
    };

    next();
  } catch (err) {
    console.error('[OrgMiddleware] Error:', err.message);
    return sendError(res, 500, 'SERVER_ERROR', 'An internal error occurred.');
  }
}

/**
 * optionalOrg — attaches org context if available, does not block if not.
 * Used on routes that work with or without an org context.
 */
export async function optionalOrg(req, res, next) {
  try {
    if (!req.user?.id) return next();

    const headerOrgId = req.headers['x-organization-id'];
    const membership = headerOrgId
      ? await prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: headerOrgId, userId: req.user.id } },
          include: { organization: true },
        })
      : await prisma.organizationMember.findFirst({
          where: { userId: req.user.id },
          orderBy: { joinedAt: 'asc' },
          include: { organization: true },
        });

    if (membership?.organization?.status === 'ACTIVE') {
      req.org = membership.organization;
      req.member = { id: membership.id, role: membership.role, userId: membership.userId };
    }

    next();
  } catch {
    next(); // Never block on optional
  }
}
