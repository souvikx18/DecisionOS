// src/modules/billing/billing.router.js
// ============================================================
// Billing Routes — Subscriptions, Plans, Checkout & Webhooks
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
  createPortalSession,
  listInvoices,
  razorpayWebhook,
} from './billing.controller.js';

const router = Router();

// ── Webhook endpoints (Raw payload, no session auth) ──────────
// NOTE: /webhook/stripe is registered directly in app.js (before express.json)
//       so Stripe's raw body signature verification works correctly.
router.post('/webhook/razorpay', razorpayWebhook);

// ── Authenticated & Org-Scoped Routes ─────────────────────────
router.use(requireAuth);
router.use(requireOrg);

// View Plans & Subscription
router.get('/plans',        authGeneralLimiter, getPlans);
router.get('/subscription', authGeneralLimiter, getSubscription);
router.get('/invoices',     authGeneralLimiter, listInvoices);

// Manage / Upgrade (requires MANAGE_ORG permission)
router.post('/checkout', requirePermission('MANAGE_ORG'), authGeneralLimiter, createCheckout);
router.post('/portal',   requirePermission('MANAGE_ORG'), authGeneralLimiter, createPortalSession);

export default router;
