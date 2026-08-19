// src/modules/auth/auth.router.js
// ============================================================
// Auth Routes
// Each route has its own rate limiter applied directly.
// Protected routes use requireAuth middleware.
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  signupLimiter, loginLimiter, verifyEmailLimiter,
  resendVerificationLimiter, forgotPasswordLimiter,
  resetPasswordLimiter, changePasswordLimiter, authGeneralLimiter,
} from '../../middleware/rateLimit.middleware.js';

import {
  signup, login, logout, logoutAll,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword, changePassword,
  getMe, getSessions, revokeSession,
} from './auth.controller.js';

const router = Router();

// ── Public Routes (no auth required) ──────────────────────────
router.post('/signup',               signupLimiter,               signup);
router.post('/login',                loginLimiter,                login);
router.post('/verify-email',         verifyEmailLimiter,          verifyEmail);
router.post('/resend-verification',  resendVerificationLimiter,   resendVerification);
router.post('/forgot-password',      forgotPasswordLimiter,       forgotPassword);
router.post('/reset-password',       resetPasswordLimiter,        resetPassword);

// ── Protected Routes (requireAuth + rate limit) ────────────────
router.post('/logout',               requireAuth, authGeneralLimiter,   logout);
router.post('/logout-all',           requireAuth, authGeneralLimiter,   logoutAll);
router.post('/change-password',      requireAuth, changePasswordLimiter, changePassword);
router.get('/me',                    requireAuth, authGeneralLimiter,   getMe);
router.get('/sessions',              requireAuth, authGeneralLimiter,   getSessions);
router.delete('/sessions/:id',       requireAuth, authGeneralLimiter,   revokeSession);

export default router;
