// src/modules/auth/auth.service.js
// ============================================================
// Auth Business Logic
// All security-critical operations live here.
// Controllers are thin — they call service functions.
// ============================================================

import argon2 from 'argon2';
import { prisma } from '../../lib/prisma.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';
import { generateToken, hashToken, expiresAt } from '../../lib/crypto.js';
import { redisIncr, redisDel, redisGet, redisSet } from '../../config/redis.js';
import { createSession, destroySession, destroyAllUserSessions, getSession } from './auth.helpers.js';

// ── Argon2id configuration (memory-hard) ──────────────────────
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB — GPU cracking impossible
  timeCost: 3,
  parallelism: 4,
};

// ── Brute force constants ──────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_TTL = 15 * 60; // 15 minutes in seconds
const BRUTE_FORCE_PREFIX = 'login_fail:';

// ── Token TTLs ─────────────────────────────────────────────────
const EMAIL_VERIFY_TTL = 24 * 60 * 60;  // 24 hours
const PASSWORD_RESET_TTL = 60 * 60;     // 1 hour

// ── SIGNUP ─────────────────────────────────────────────────────
export async function signupService(req, { firstName, lastName, email, password }) {
  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Return same response as success to prevent email enumeration
    // Actual "user already exists" error handled by controller checking this return
    return { alreadyExists: true };
  }

  // Hash password
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  // Create user
  const user = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash, isEmailVerified: false },
  });

  // Generate email verification token
  const rawToken = generateToken(32);
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      token: rawToken,
      expiresAt: expiresAt(EMAIL_VERIFY_TTL),
    },
  });

  // TODO Phase 8: Queue email via BullMQ
  // For now, log it to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] Email verification token for ${email}: ${rawToken}`);
  }

  await logAudit({
    action: 'USER_LOGIN', // Using USER_LOGIN as proxy until we add USER_SIGNUP to enum
    userId: user.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'SIGNUP', email },
  });

  return { user, token: rawToken };
}

// ── LOGIN ──────────────────────────────────────────────────────
export async function loginService(req, res, { email, password }) {
  const ip = getIpAddress(req);
  const ua = getUserAgent(req);
  const bruteKey = `${BRUTE_FORCE_PREFIX}${email}`;

  // 1. Check brute force lockout
  const failCount = await redisGet(bruteKey);
  if (failCount && parseInt(failCount) >= MAX_LOGIN_ATTEMPTS) {
    return { locked: true };
  }

  // 2. Look up user
  const user = await prisma.user.findUnique({ where: { email } });

  // 3. ALWAYS run argon2.verify — even if user not found (prevents timing attack)
  // Use a dummy hash when user doesn't exist so timing is consistent
  const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$dGVzdGhhc2g';
  const hashToVerify = user?.passwordHash ?? DUMMY_HASH;

  let passwordValid = false;
  try {
    passwordValid = await argon2.verify(hashToVerify, password);
  } catch {
    passwordValid = false;
  }

  // 4. If invalid credentials
  if (!user || !passwordValid) {
    // Increment failure counter
    const redis = await import('../../config/redis.js');
    const count = await redis.redisIncr(bruteKey, LOGIN_LOCKOUT_TTL);

    await logAudit({
      action: 'USER_LOGIN',
      userId: user?.id ?? null,
      ipAddress: ip,
      userAgent: ua,
      metadata: { event: 'LOGIN_FAILED', email, failCount: count },
    });

    if (count >= MAX_LOGIN_ATTEMPTS) {
      // TODO Phase 10: Send lockout alert email
      return { locked: true };
    }

    return { invalid: true };
  }

  // 5. Check email verified
  if (!user.isEmailVerified) {
    return { unverified: true };
  }

  // 6. Reset brute force counter on success
  await redisDel(bruteKey);

  // 7. Create session (Redis + DB + cookie)
  await createSession(res, user, req);

  // 8. Update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 9. Audit log
  await logAudit({
    action: 'USER_LOGIN',
    userId: user.id,
    ipAddress: ip,
    userAgent: ua,
    metadata: { event: 'LOGIN_SUCCESS' },
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl,
    },
  };
}

// ── LOGOUT ─────────────────────────────────────────────────────
export async function logoutService(req, res) {
  const token = req.cookies?.session;
  if (!token) return;

  await destroySession(res, token);

  await logAudit({
    action: 'USER_LOGOUT',
    userId: req.user?.id ?? null,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
  });
}

// ── LOGOUT ALL ─────────────────────────────────────────────────
export async function logoutAllService(req, res) {
  if (!req.user?.id) return;

  await destroyAllUserSessions(res, req.user.id);

  await logAudit({
    action: 'USER_LOGOUT',
    userId: req.user.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'LOGOUT_ALL_SESSIONS' },
  });
}

// ── VERIFY EMAIL ───────────────────────────────────────────────
export async function verifyEmailService(rawToken) {
  const verification = await prisma.emailVerification.findUnique({
    where: { token: rawToken },
    include: { user: true },
  });

  if (!verification) return { invalid: true };
  if (verification.usedAt) return { alreadyUsed: true };
  if (verification.expiresAt < new Date()) return { expired: true };

  // Mark as used + verify user
  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: verification.userId },
      data: { isEmailVerified: true },
    }),
  ]);

  return { success: true, email: verification.user.email };
}

// ── RESEND VERIFICATION ────────────────────────────────────────
export async function resendVerificationService(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success (prevents enumeration)
  if (!user || user.isEmailVerified) return { sent: true };

  // Invalidate old tokens
  await prisma.emailVerification.deleteMany({ where: { userId: user.id } });

  // Create new token
  const rawToken = generateToken(32);
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      token: rawToken,
      expiresAt: expiresAt(EMAIL_VERIFY_TTL),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] Resend verification token for ${email}: ${rawToken}`);
  }

  return { sent: true };
}

// ── FORGOT PASSWORD ────────────────────────────────────────────
export async function forgotPasswordService(req, email) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — never reveal if email exists
  if (!user) return { sent: true };

  // Invalidate previous reset tokens
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

  // Generate raw token — only goes in the email
  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken); // Store only hash in DB

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: expiresAt(PASSWORD_RESET_TTL),
    },
  });

  // TODO Phase 10: Send password reset email via Resend/BullMQ
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] Password reset token for ${email}: ${rawToken}`);
    console.log(`[Auth] Reset link: ${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`);
  }

  await logAudit({
    action: 'PASSWORD_CHANGED',
    userId: user.id,
    ipAddress: getIpAddress(req),
    metadata: { event: 'PASSWORD_RESET_REQUESTED' },
  });

  return { sent: true };
}

// ── RESET PASSWORD ─────────────────────────────────────────────
export async function resetPasswordService(req, { token: rawToken, newPassword }) {
  // Hash the raw token to look it up in DB
  const tokenHash = hashToken(rawToken);

  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });

  if (!reset) return { invalid: true };
  if (reset.usedAt) return { alreadyUsed: true };
  if (reset.expiresAt < new Date()) return { expired: true };

  // Hash new password
  const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

  // Apply in a transaction
  await prisma.$transaction([
    // Update password
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    // Mark reset token as used
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);

  // Destroy ALL sessions for this user (force re-login everywhere)
  await destroyAllUserSessions(null, reset.userId);

  // TODO Phase 10: Send "your password was changed" confirmation email

  await logAudit({
    action: 'PASSWORD_CHANGED',
    userId: reset.userId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'PASSWORD_RESET_COMPLETED' },
  });

  return { success: true };
}

// ── CHANGE PASSWORD ────────────────────────────────────────────
export async function changePasswordService(req, res, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  // Verify current password
  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) return { invalidCurrent: true };

  // Hash and save new password
  const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Destroy all OTHER sessions (keep current)
  const currentToken = req.cookies?.session;
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, NOT: { token: currentToken } },
    select: { token: true },
  });

  if (sessions.length > 0) {
    const { getRedis } = await import('../../config/redis.js');
    const redis = getRedis();
    const pipeline = redis.pipeline();
    sessions.forEach((s) => pipeline.del(`session:${s.token}`));
    await pipeline.exec();
    await prisma.session.deleteMany({
      where: { userId: user.id, NOT: { token: currentToken } },
    });
  }

  await logAudit({
    action: 'PASSWORD_CHANGED',
    userId: user.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
  });

  return { success: true };
}

// ── GET ACTIVE SESSIONS ────────────────────────────────────────
export async function getSessionsService(userId) {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return sessions;
}

// ── REVOKE SPECIFIC SESSION ────────────────────────────────────
export async function revokeSessionService(userId, sessionId) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId }, // Ensure session belongs to this user
  });

  if (!session) return { notFound: true };

  await redisDel(`session:${session.token}`);
  await prisma.session.delete({ where: { id: sessionId } });

  return { success: true };
}
