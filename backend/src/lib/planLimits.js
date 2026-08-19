// src/lib/planLimits.js
// ============================================================
// Plan Limit Checker
// Checks whether an org has exceeded its plan limits before
// allowing seat additions, AI calls, imports, storage, etc.
// ============================================================

import { prisma } from './prisma.js';

/**
 * Get the current plan limits for an organization.
 * Reads from the org's active subscription → plan.
 */
export async function getOrgPlan(orgId) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: {
      plan: {
        select: {
          tier: true,
          maxMembers: true,
          maxAiCallsPerMonth: true,
          maxImportsPerMonth: true,
          maxStorageMb: true,
        },
      },
    },
  });

  if (!subscription) {
    // Fallback: fetch FREE plan limits directly
    const freePlan = await prisma.plan.findUnique({
      where: { tier: 'FREE' },
      select: {
        tier: true,
        maxMembers: true,
        maxAiCallsPerMonth: true,
        maxImportsPerMonth: true,
        maxStorageMb: true,
      },
    });
    return freePlan;
  }

  return subscription.plan;
}

/**
 * Check if the org can add more members.
 * Counts current members + pending invitations.
 *
 * @returns {{ allowed: boolean, current: number, max: number }}
 */
export async function checkMemberLimit(orgId) {
  const plan = await getOrgPlan(orgId);

  const [memberCount, pendingInvites] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId: orgId } }),
    prisma.invitation.count({
      where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);

  const current = memberCount + pendingInvites;
  const max = plan?.maxMembers ?? 2; // Default to FREE limit

  return {
    allowed: current < max,
    current,
    max,
    tier: plan?.tier ?? 'FREE',
  };
}

/**
 * Check if the org can make more AI calls this month.
 */
export async function checkAiCallLimit(orgId) {
  const plan = await getOrgPlan(orgId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageCount = await prisma.aiUsage.count({
    where: { organizationId: orgId, createdAt: { gte: startOfMonth } },
  });

  const max = plan?.maxAiCallsPerMonth ?? 5;

  return {
    allowed: usageCount < max,
    current: usageCount,
    max,
    tier: plan?.tier ?? 'FREE',
  };
}

/**
 * Check if the org can run more imports this month.
 */
export async function checkImportLimit(orgId) {
  const plan = await getOrgPlan(orgId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const importCount = await prisma.dataImport.count({
    where: { organizationId: orgId, createdAt: { gte: startOfMonth } },
  });

  const max = plan?.maxImportsPerMonth ?? 5;

  return {
    allowed: importCount < max,
    current: importCount,
    max,
    tier: plan?.tier ?? 'FREE',
  };
}
