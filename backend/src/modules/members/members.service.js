// src/modules/members/members.service.js
// ============================================================
// Members Business Logic
// Enforces all RBAC rules around member management.
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';
import { getRoleRank } from '../../middleware/rbac.middleware.js';
import { destroyAllUserSessions } from '../auth/auth.helpers.js';

// Shared member select
const MEMBER_SELECT = {
  id: true,
  role: true,
  joinedAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      lastLoginAt: true,
    },
  },
};

// ── LIST MEMBERS ───────────────────────────────────────────────
export async function listMembersService(orgId) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    orderBy: [
      // OWNER first, then ADMIN, ANALYST, VIEWER
      { role: 'asc' },
      { joinedAt: 'asc' },
    ],
    select: MEMBER_SELECT,
  });

  return members;
}

// ── GET SINGLE MEMBER ──────────────────────────────────────────
export async function getMemberService(orgId, memberId) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
    select: MEMBER_SELECT,
  });

  if (!member) return { notFound: true };
  return { member };
}

// ── CHANGE MEMBER ROLE ─────────────────────────────────────────
export async function changeRoleService(req, orgId, memberId, newRole) {
  const actorRole = req.member.role;
  const actorUserId = req.user.id;

  // Find target member
  const target = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
    select: { id: true, role: true, userId: true },
  });

  if (!target) return { notFound: true };

  // Cannot change your own role
  if (target.userId === actorUserId) return { selfChange: true };

  // Cannot touch the OWNER's role (unless you are OWNER too)
  if (target.role === 'OWNER') return { cannotChangeOwner: true };

  // ADMIN can only assign roles strictly below ADMIN
  // (cannot promote to ADMIN or OWNER)
  if (actorRole === 'ADMIN') {
    const actorRank = getRoleRank('ADMIN');
    const newRoleRank = getRoleRank(newRole);
    if (newRoleRank >= actorRank) {
      return { insufficientRank: true };
    }
  }

  // Perform the role change
  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: newRole },
    select: MEMBER_SELECT,
  });

  await logAudit({
    action: 'MEMBER_ROLE_CHANGED',
    userId: actorUserId,
    orgId,
    entityType: 'OrganizationMember',
    entityId: memberId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { targetUserId: target.userId, oldRole: target.role, newRole },
  });

  return { member: updated };
}

// ── REMOVE MEMBER ──────────────────────────────────────────────
export async function removeMemberService(req, orgId, memberId) {
  const actorRole = req.member.role;
  const actorUserId = req.user.id;

  const target = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
    select: { id: true, role: true, userId: true },
  });

  if (!target) return { notFound: true };

  // Cannot remove yourself via this endpoint (use /leave instead)
  if (target.userId === actorUserId) return { selfRemove: true };

  // ADMIN cannot remove OWNER or another ADMIN (same level)
  if (actorRole === 'ADMIN') {
    const targetRank = getRoleRank(target.role);
    const actorRank = getRoleRank('ADMIN');
    if (targetRank >= actorRank) return { insufficientRank: true };
  }

  // Cannot remove the last OWNER
  if (target.role === 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId: orgId, role: 'OWNER' },
    });
    if (ownerCount <= 1) return { lastOwner: true };
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });

  // Invalidate removed user's sessions for this org
  // (they lose access immediately — we destroy ALL their sessions for safety)
  await destroyAllUserSessions(null, target.userId);

  await logAudit({
    action: 'MEMBER_REMOVED',
    userId: actorUserId,
    orgId,
    entityType: 'OrganizationMember',
    entityId: memberId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { removedUserId: target.userId, removedRole: target.role },
  });

  return { success: true };
}

// ── LEAVE ORGANIZATION ─────────────────────────────────────────
export async function leaveOrgService(req, orgId) {
  const userId = req.user.id;
  const membershipId = req.member.id;
  const role = req.member.role;

  // If OWNER, check there's at least one other OWNER
  if (role === 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId: orgId, role: 'OWNER' },
    });
    if (ownerCount <= 1) return { lastOwner: true };
  }

  await prisma.organizationMember.delete({ where: { id: membershipId } });

  await logAudit({
    action: 'MEMBER_REMOVED',
    userId,
    orgId,
    entityType: 'OrganizationMember',
    entityId: membershipId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'MEMBER_LEFT_ORG', role },
  });

  return { success: true };
}
