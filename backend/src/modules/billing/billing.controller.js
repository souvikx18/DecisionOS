// src/modules/billing/billing.controller.js
// ============================================================
// Billing Controller — Secure HTTP Handlers
// ============================================================

import { sendSuccess, sendError } from '../../lib/response.js';
import { checkoutSchema, portalSchema } from './billing.schema.js';
import {
  getPlansService,
  getSubscriptionService,
  createCheckoutSessionService,
  createPortalSessionService,
  listInvoicesService,
  handleStripeWebhookService,
  handleRazorpayWebhookService,
} from './billing.service.js';

export async function getPlans(req, res) {
  try {
    const data = await getPlansService(req.org?.id);
    return sendSuccess(res, data, 200, 'Plans retrieved successfully.');
  } catch (err) {
    return sendError(res, 500, 'SERVER_ERROR', err.message);
  }
}

export async function getSubscription(req, res) {
  try {
    const data = await getSubscriptionService(req.org.id);
    return sendSuccess(res, data, 200, 'Subscription retrieved successfully.');
  } catch (err) {
    return sendError(res, 500, 'SERVER_ERROR', err.message);
  }
}

export async function createCheckout(req, res) {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0]?.message);
    }

    const data = await createCheckoutSessionService(req.org.id, req.user.id, parsed.data);
    return sendSuccess(res, data, 200, 'Checkout session created.');
  } catch (err) {
    return sendError(res, 400, 'CHECKOUT_ERROR', err.message);
  }
}

export async function createPortalSession(req, res) {
  try {
    const parsed = portalSchema.safeParse(req.body);
    const returnUrl = parsed.success ? parsed.data.returnUrl : undefined;

    const data = await createPortalSessionService(req.org.id, returnUrl);
    return sendSuccess(res, data, 200, 'Customer portal session created.');
  } catch (err) {
    return sendError(res, 500, 'PORTAL_ERROR', err.message);
  }
}

export async function listInvoices(req, res) {
  try {
    const data = await listInvoicesService(req.org.id);
    return sendSuccess(res, data, 200, 'Invoices ledger retrieved.');
  } catch (err) {
    return sendError(res, 500, 'SERVER_ERROR', err.message);
  }
}

export async function stripeWebhook(req, res) {
  try {
    const signature = req.headers['stripe-signature'];
    const rawBody = req.body; // Buffer or raw string

    const result = await handleStripeWebhookService(rawBody, signature);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[Billing Controller] Stripe webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

export async function razorpayWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body;

    const result = handleRazorpayWebhookService(rawBody, signature);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[Billing Controller] Razorpay webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
