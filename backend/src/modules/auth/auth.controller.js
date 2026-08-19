// src/modules/auth/auth.controller.js
// ============================================================
// Auth Controllers — Thin layer between routes and services.
// Responsible for: reading request, calling service, sending response.
// All business logic is in auth.service.js
// ============================================================

import {
  signupSchema, loginSchema, verifyEmailSchema,
  resendVerificationSchema, forgotPasswordSchema,
  resetPasswordSchema, changePasswordSchema,
} from './auth.schema.js';

import {
  signupService, loginService, logoutService, logoutAllService,
  verifyEmailService, resendVerificationService, forgotPasswordService,
  resetPasswordService, changePasswordService, getSessionsService,
  revokeSessionService,
} from './auth.service.js';

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';

// ── POST /api/v1/auth/signup ───────────────────────────────────
export async function signup(req, res) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await signupService(req, parsed.data);

  if (result.alreadyExists) {
    // Return 409 but with a non-specific message (prevent full enumeration)
    return sendError(res, 409, 'EMAIL_IN_USE', 'An account with this email already exists.');
  }

  return sendSuccess(
    res,
    null,
    201,
    'Account created successfully. Please check your email to verify your account.'
  );
}

// ── POST /api/v1/auth/login ────────────────────────────────────
export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await loginService(req, res, parsed.data);

  if (result.locked) {
    return sendError(
      res, 423, 'ACCOUNT_LOCKED',
      'Too many failed login attempts. Your account is temporarily locked. Please try again in 15 minutes.'
    );
  }

  if (result.invalid) {
    return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (result.unverified) {
    return sendError(
      res, 403, 'EMAIL_NOT_VERIFIED',
      'Please verify your email address before logging in. Check your inbox for the verification link.'
    );
  }

  return sendSuccess(res, { user: result.user }, 200);
}

// ── POST /api/v1/auth/logout ───────────────────────────────────
export async function logout(req, res) {
  await logoutService(req, res);
  return sendSuccess(res, null, 200, 'Logged out successfully.');
}

// ── POST /api/v1/auth/logout-all ──────────────────────────────
export async function logoutAll(req, res) {
  await logoutAllService(req, res);
  return sendSuccess(res, null, 200, 'All sessions terminated successfully.');
}

// ── POST /api/v1/auth/verify-email ────────────────────────────
export async function verifyEmail(req, res) {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await verifyEmailService(parsed.data.token);

  if (result.invalid) return sendError(res, 400, 'INVALID_TOKEN', 'This verification link is invalid.');
  if (result.alreadyUsed) return sendError(res, 400, 'TOKEN_ALREADY_USED', 'This verification link has already been used.');
  if (result.expired) return sendError(res, 400, 'TOKEN_EXPIRED', 'This verification link has expired. Please request a new one.');

  return sendSuccess(res, null, 200, 'Email verified successfully. You can now log in.');
}

// ── POST /api/v1/auth/resend-verification ─────────────────────
export async function resendVerification(req, res) {
  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  await resendVerificationService(parsed.data.email);

  // Always return same response (prevents enumeration)
  return sendSuccess(
    res, null, 200,
    'If your email is registered and unverified, a new verification link has been sent.'
  );
}

// ── POST /api/v1/auth/forgot-password ─────────────────────────
export async function forgotPassword(req, res) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  await forgotPasswordService(req, parsed.data.email);

  // Always return same response (prevents enumeration)
  return sendSuccess(
    res, null, 200,
    'If that email is registered, a password reset link has been sent. Please check your inbox.'
  );
}

// ── POST /api/v1/auth/reset-password ──────────────────────────
export async function resetPassword(req, res) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await resetPasswordService(req, parsed.data);

  if (result.invalid) return sendError(res, 400, 'INVALID_TOKEN', 'This reset link is invalid.');
  if (result.alreadyUsed) return sendError(res, 400, 'TOKEN_ALREADY_USED', 'This reset link has already been used.');
  if (result.expired) return sendError(res, 400, 'TOKEN_EXPIRED', 'This reset link has expired. Please request a new one.');

  return sendSuccess(res, null, 200, 'Password reset successfully. Please log in with your new password.');
}

// ── POST /api/v1/auth/change-password ─────────────────────────
export async function changePassword(req, res) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await changePasswordService(req, res, parsed.data);

  if (result.invalidCurrent) {
    return sendError(res, 400, 'INVALID_PASSWORD', 'Your current password is incorrect.');
  }

  return sendSuccess(res, null, 200, 'Password changed successfully.');
}

// ── GET /api/v1/auth/me ────────────────────────────────────────
export async function getMe(req, res) {
  return sendSuccess(res, { user: req.user });
}

// ── GET /api/v1/auth/sessions ─────────────────────────────────
export async function getSessions(req, res) {
  const sessions = await getSessionsService(req.user.id);
  return sendSuccess(res, { sessions });
}

// ── DELETE /api/v1/auth/sessions/:id ──────────────────────────
export async function revokeSession(req, res) {
  const { id } = req.params;
  const result = await revokeSessionService(req.user.id, id);

  if (result.notFound) {
    return sendError(res, 404, 'SESSION_NOT_FOUND', 'Session not found.');
  }

  return sendSuccess(res, null, 200, 'Session revoked successfully.');
}
