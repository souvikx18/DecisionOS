// src/lib/audit.js
// ============================================================
// Audit Log Helper
// Every sensitive action in DecisionOS is recorded here.
// Call logAudit() after any significant operation.
//
// Stored in: audit_logs table (PostgreSQL)
// Never throws — audit failures must not break business logic.
// ============================================================

import { prisma } from './prisma.js';

/**
 * Log an audit event to the database.
 * Fire-and-forget — errors are caught and logged to console only.
 *
 * @param {object} options
 * @param {string} options.action      - AuditAction enum value
 * @param {string} [options.userId]    - ID of user performing action
 * @param {string} [options.orgId]     - ID of organization context
 * @param {string} [options.entityType]- Type of entity affected (User, Sale, etc.)
 * @param {string} [options.entityId]  - ID of entity affected
 * @param {string} [options.ipAddress] - Request IP address
 * @param {string} [options.userAgent] - Request user agent
 * @param {object} [options.metadata]  - Any extra data (before/after values, etc.)
 */
export async function logAudit({
  action,
  userId = null,
  orgId = null,
  entityType = null,
  entityId = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        organizationId: orgId,
        entityType,
        entityId,
        ipAddress,
        userAgent,
        metadata,
      },
    });
  } catch (err) {
    // Audit failures must never crash the app or break the request
    console.error('[Audit] Failed to write audit log:', err.message, { action, userId, orgId });
  }
}

/**
 * Extract IP address from Express request
 * Handles proxies (X-Forwarded-For) and direct connections
 */
export function getIpAddress(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

/**
 * Extract user agent from Express request
 */
export function getUserAgent(req) {
  return req.headers['user-agent'] || null;
}
