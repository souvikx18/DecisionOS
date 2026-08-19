// src/modules/invitations/invitations.service.js
// ============================================================
// Invitations Business Logic
// Handles: send, list, cancel, preview, accept
// ============================================================

import argon2 from 'argon2';
import { prisma } from '../../lib/prisma.js';
import { generateToken, expiresAt } from '../../lib/crypto.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';
import { checkMemberLimit } from '../../lib/planLimits.js';
import { createSession } from '../auth/auth.helpers.js';
import { env } from '../../config/env.js';

const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// ── SEND INVITATION ────────────────────────────────────────────
export async function sendInvitationService(req, orgId, { email, role }) {
  const actorUserId = req.user.id;

  // 1. Check seat limit
  const limitCheck = await checkMemberLimit(orgId);
  if (!limitCheck.allowed) {
    return {
      seatLimitReached: true,
      current: limitCheck.current,
      max: limitCheck.max,
      tier: limitCheck.tier,
    };
  }

  // 2. Check if email is already a member
  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      user: { email },
    },
  });
  if (existingMember) return { alreadyMember: true };

  // 3. Check if invitation already pending for this email in this org
  const existingInvite = await prisma.invitation.findFirst({
    where: {
      organizationId: orgId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) return { alreadyInvited: true };

  // 4. Generate invitation token (raw — sent in email)
  const token = generateToken(32);

  // 5. Create invitation in DB
  const invitation = await prisma.invitation.create({
    data: {
      organizationId: orgId,
      email,
      role,
      token,
      expiresAt: expiresAt(INVITE_TTL_SECONDS),
    },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      organization: { select: { name: true } },
    },
  });

  // 6. Send invitation email
  // TODO Phase 10: Queue email via BullMQ
  const inviteLink = `${env.FRONTEND_URL}/invite/accept?token=${token}`;
  if (env.NODE_ENV === 'development') {
    console.log(`[Invitation] Invite link for ${email}: ${inviteLink}`);
  }

  await logAudit({
    action: 'USER_INVITED',
    userId: actorUserId,
    orgId,
    entityType: 'Invitation',
    entityId: invitation.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { invitedEmail: email, role },
  });

  return { invitation };
}

// ── LIST INVITATIONS ───────────────────────────────────────────
export async function listInvitationsService(orgId) {
  const invitations = await prisma.invitation.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      createdAt: true,
    },
  });

  // Annotate with status
  const now = new Date();
  return invitations.map((inv) => ({
    ...inv,
    status: inv.acceptedAt
      ? 'ACCEPTED'
      : inv.expiresAt < now
      ? 'EXPIRED'
      : 'PENDING',
  }));
}

// ── CANCEL INVITATION ──────────────────────────────────────────
export async function cancelInvitationService(req, orgId, invitationId) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId: orgId },
  });

  if (!invitation) return { notFound: true };
  if (invitation.acceptedAt) return { alreadyAccepted: true };

  await prisma.invitation.delete({ where: { id: invitationId } });

  await logAudit({
    action: 'USER_INVITED',
    userId: req.user.id,
    orgId,
    entityType: 'Invitation',
    entityId: invitationId,
    ipAddress: getIpAddress(req),
    metadata: { event: 'INVITATION_CANCELLED', email: invitation.email },
  });

  return { success: true };
}

// ── PREVIEW INVITATION (GET) ───────────────────────────────────
export async function previewInvitationService(rawToken) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: rawToken },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      organization: {
        select: { id: true, name: true, logoUrl: true },
      },
    },
  });

  if (!invitation) return { invalid: true };
  if (invitation.acceptedAt) return { alreadyAccepted: true };
  if (invitation.expiresAt < new Date()) return { expired: true };

  // Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, firstName: true, lastName: true },
  });

  return { invitation, existingUser: !!existingUser };
}

// ── ACCEPT INVITATION (POST) ───────────────────────────────────
export async function acceptInvitationService(req, res, { token: rawToken, firstName, lastName, password }) {
  // 1. Verify token
  const invitation = await prisma.invitation.findUnique({
    where: { token: rawToken },
    include: { organization: { select: { id: true, name: true, status: true } } },
  });

  if (!invitation) return { invalid: true };
  if (invitation.acceptedAt) return { alreadyAccepted: true };
  if (invitation.expiresAt < new Date()) return { expired: true };
  if (invitation.organization.status !== 'ACTIVE') return { orgNotActive: true };

  // 2. Find or create user
  let user = await prisma.user.findUnique({ where: { email: invitation.email } });

  if (!user) {
    // New user — requires firstName, lastName, password
    if (!firstName || !lastName || !password) {
      return { needsAccount: true };
    }

    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
    user = await prisma.user.create({
      data: {
        email: invitation.email,
        firstName,
        lastName,
        passwordHash,
        isEmailVerified: true, // Email verified via invite link
      },
    });
  }

  // 3. Check user not already a member
  const existingMembership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invitation.organizationId,
        userId: user.id,
      },
    },
  });

  if (existingMembership) return { alreadyMember: true };

  // 4. Add to org + mark invite accepted (atomic)
  const [member] = await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  // 5. Auto-login — create session + set cookie
  await createSession(res, user, req);

  await logAudit({
    action: 'USER_INVITED',
    userId: user.id,
    orgId: invitation.organizationId,
    entityType: 'Invitation',
    entityId: invitation.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'INVITATION_ACCEPTED', role: invitation.role },
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    organization: invitation.organization,
    member: { role: member.role },
  };
}
