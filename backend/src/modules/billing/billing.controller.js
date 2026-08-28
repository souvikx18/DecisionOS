// src/modules/billing/billing.controller.js
// ============================================================
// Billing Controller — Secure Razorpay HTTP Handlers
// ============================================================

import { sendSuccess, sendError } from '../../lib/response.js';
import { checkoutSchema, verifyPaymentSchema, portalSchema } from './billing.schema.js';
import {
  getPlansService,
  getSubscriptionService,
  createCheckoutSessionService,
  verifyRazorpayPaymentService,
  createPortalSessionService,
  listInvoicesService,
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
      const errMsg = parsed.error?.errors?.[0]?.message || parsed.error?.issues?.[0]?.message || 'Invalid checkout parameters.';
      return sendError(res, 400, 'VALIDATION_ERROR', errMsg);
    }

    const data = await createCheckoutSessionService(req.org.id, req.user.id, parsed.data);
    return sendSuccess(res, data, 200, 'Razorpay checkout order created.');
  } catch (err) {
    return sendError(res, 400, 'CHECKOUT_ERROR', err.message);
  }
}

export async function verifyPayment(req, res) {
  try {
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      const errMsg = parsed.error?.errors?.[0]?.message || parsed.error?.issues?.[0]?.message || 'Invalid payment verification parameters.';
      return sendError(res, 400, 'VALIDATION_ERROR', errMsg);
    }

    const data = await verifyRazorpayPaymentService(req.org.id, req.user.id, parsed.data);
    return sendSuccess(res, data, 200, 'Payment verified and plan activated successfully.');
  } catch (err) {
    return sendError(res, 400, 'VERIFICATION_ERROR', err.message);
  }
}


export async function createPortalSession(req, res) {
  try {
    const parsed = portalSchema.safeParse(req.body);
    const returnUrl = parsed.success ? parsed.data.returnUrl : undefined;

    const data = await createPortalSessionService(req.org.id, returnUrl);
    return sendSuccess(res, data, 200, 'Billing portal session created.');
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

export async function razorpayWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    console.warn('[Billing Controller] ❌ Razorpay webhook rejected: Missing x-razorpay-signature header.');
    return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
  }

  try {
    const rawBody = req.body;
    const result = await handleRazorpayWebhookService(rawBody, signature);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[Billing Controller] ❌ Razorpay webhook processing error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
}
