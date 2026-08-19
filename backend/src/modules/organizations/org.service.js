// src/modules/organizations/org.service.js
// ============================================================
// Organization Business Logic
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { generateUniqueSlug } from '../../lib/slugify.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';
import { destroyAllUserSessions } from '../auth/auth.helpers.js';
import { getRedis } from '../../config/redis.js';

// ── Shared org select (what we return to clients) ─────────────
const ORG_SELECT = {
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
};

// ── CREATE ORGANIZATION ────────────────────────────────────────
export async function createOrgService(req, { name, industry, timezone, currency }) {
  const userId = req.user.id;

  // Generate unique slug from org name
  const slug = await generateUniqueSlug(name);

  // Fetch FREE plan for auto-subscription
  const freePlan = await prisma.plan.findUnique({ where: { tier: 'FREE' } });
  if (!freePlan) throw new Error('FREE plan not found in database. Run db:seed first.');

  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  // Create org + OWNER membership + FREE subscription atomically
  const [org, member] = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name, slug, industry, timezone, currency, status: 'ACTIVE' },
      select: ORG_SELECT,
    });

    const membership = await tx.organizationMember.create({
      data: { organizationId: organization.id, userId, role: 'OWNER' },
    });

    // Auto-assign FREE subscription
    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: oneYearLater,
      },
    });

    return [organization, membership];
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId,
    orgId: org.id,
    entityType: 'Organization',
    entityId: org.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'ORG_CREATED', name, slug },
  });

  return { organization: org, member: { id: member.id, role: member.role } };
}

// ── GET CURRENT ORG ────────────────────────────────────────────
export async function getOrgService(orgId) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      ...ORG_SELECT,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          plan: { select: { tier: true, name: true, maxMembers: true } },
        },
      },
      _count: { select: { members: true } },
    },
  });

  return org;
}

// ── UPDATE ORG ─────────────────────────────────────────────────
export async function updateOrgService(req, orgId, updates) {
  // If name is changing, regenerate slug
  let slug;
  if (updates.name) {
    slug = await generateUniqueSlug(updates.name, orgId);
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { ...updates, ...(slug && { slug }) },
    select: ORG_SELECT,
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'Organization',
    entityId: orgId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'ORG_UPDATED', changes: Object.keys(updates) },
  });

  return org;
}

// ── LIST USER'S ORGS ───────────────────────────────────────────
export async function getMyOrgsService(userId) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      organization: {
        select: {
          ...ORG_SELECT,
          _count: { select: { members: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    joinedAt: m.joinedAt,
    organization: m.organization,
  }));
}

// ── DELETE ORG (soft-delete) ───────────────────────────────────
export async function deleteOrgService(req, orgId) {
  // Check for active paid subscription
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: { select: { tier: true } } },
  });

  const isPaidActive =
    subscription &&
    subscription.status === 'ACTIVE' &&
    subscription.plan.tier !== 'FREE';

  if (isPaidActive) {
    return { hasPaidSubscription: true };
  }

  // Get all members to clear their sessions
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    select: { userId: true },
  });

  // Soft-delete
  await prisma.organization.update({
    where: { id: orgId },
    data: { status: 'DELETED' },
  });

  // Clear all member sessions (kick everyone out)
  for (const { userId } of members) {
    await destroyAllUserSessions(null, userId);
  }

  await logAudit({
    action: 'ACCOUNT_DELETED',
    userId: req.user.id,
    orgId,
    entityType: 'Organization',
    entityId: orgId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
  });

  return { success: true };
}
