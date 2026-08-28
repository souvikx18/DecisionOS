// src/modules/billing/billing.router.js
// ============================================================
// Billing Routes — Subscriptions, Plans, Razorpay Orders & Verification
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  getPlans,
  getSubscription,
  createCheckout,
  verifyPayment,
  createPortalSession,
  listInvoices,
} from './billing.controller.js';

const router = Router();

// ── Authenticated & Org-Scoped Routes ─────────────────────────
router.use(requireAuth);
router.use(requireOrg);

// View Plans & Subscription
router.get('/plans',        authGeneralLimiter, getPlans);
router.get('/subscription', authGeneralLimiter, getSubscription);
router.get('/invoices',     authGeneralLimiter, listInvoices);

// Manage / Upgrade (requires MANAGE_ORG permission)
router.post('/checkout',       requirePermission('MANAGE_ORG'), authGeneralLimiter, createCheckout);
router.post('/verify-payment', requirePermission('MANAGE_ORG'), authGeneralLimiter, verifyPayment);
router.post('/portal',         requirePermission('MANAGE_ORG'), authGeneralLimiter, createPortalSession);

export default router;
