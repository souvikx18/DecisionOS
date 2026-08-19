// src/middleware/rbac.middleware.js
// ============================================================
// Role-Based Access Control (RBAC) Middleware Factory
//
// Usage in routers:
//   import { requirePermission } from '../../middleware/rbac.middleware.js';
//   router.patch('/settings', requireAuth, requireOrg, requirePermission('MANAGE_ORG'), controller);
//
// Must run AFTER requireAuth + requireOrg (needs req.member.role).
// ============================================================

import { sendError } from '../lib/response.js';

// ── Permission → Allowed Roles map ────────────────────────────
export const PERMISSIONS = {
  // Org-level management
  MANAGE_ORG:      ['OWNER', 'ADMIN'],
  DELETE_ORG:      ['OWNER'],

  // Member management
  MANAGE_MEMBERS:  ['OWNER', 'ADMIN'],

  // Billing
  MANAGE_BILLING:  ['OWNER', 'ADMIN'],

  // Data operations
  MANAGE_DATA:     ['OWNER', 'ADMIN', 'ANALYST'],
  DELETE_DATA:     ['OWNER', 'ADMIN'],
  IMPORT_DATA:     ['OWNER', 'ADMIN', 'ANALYST'],
  EXPORT_DATA:     ['OWNER', 'ADMIN', 'ANALYST'],
  VIEW_DATA:       ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'],

  // AI operations
  RUN_AI:          ['OWNER', 'ADMIN', 'ANALYST'],

  // Reports
  CREATE_REPORT:   ['OWNER', 'ADMIN', 'ANALYST'],
  VIEW_REPORT:     ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'],
};

// Role hierarchy (higher index = higher privilege)
const ROLE_HIERARCHY = ['VIEWER', 'ANALYST', 'ADMIN', 'OWNER'];

/**
 * Get numeric rank of a role (higher = more powerful)
 */
export function getRoleRank(role) {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if role A is higher than or equal to role B
 */
export function roleAtLeast(role, minRole) {
  return getRoleRank(role) >= getRoleRank(minRole);
}

/**
 * Factory: returns an Express middleware that enforces a permission.
 * @param {keyof typeof PERMISSIONS} permission
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    const role = req.member?.role;

    if (!role) {
      return sendError(res, 403, 'FORBIDDEN', 'Organization context required.');
    }

    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) {
      console.error(`[RBAC] Unknown permission: ${permission}`);
      return sendError(res, 500, 'SERVER_ERROR', 'Invalid permission configuration.');
    }

    if (!allowedRoles.includes(role)) {
      return sendError(
        res, 403, 'INSUFFICIENT_PERMISSIONS',
        `Your role (${role}) does not have permission to perform this action.`
      );
    }

    next();
  };
}

/**
 * Shorthand middleware — requires at least ADMIN role
 */
export const requireAdmin = requirePermission('MANAGE_ORG');

/**
 * Shorthand middleware — requires OWNER role
 */
export const requireOwner = requirePermission('DELETE_ORG');
