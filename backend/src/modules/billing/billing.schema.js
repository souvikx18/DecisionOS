// src/modules/billing/billing.schema.js
// ============================================================
// Zod Validation Schemas for Billing & Razorpay Checkout Endpoints
// ============================================================

import { z } from 'zod';

export const checkoutSchema = z
  .object({
    planTier: z.enum(['PRO', 'ENTERPRISE'], {
      required_error: 'Plan tier is required (PRO or ENTERPRISE).',
    }),
    interval: z.enum(['monthly', 'yearly']).default('monthly'),
    currency: z.enum(['INR', 'USD']).default('INR'),
    gateway: z.enum(['razorpay']).default('razorpay'),
    notes: z.record(z.string()).optional(),
  })
  .strict();

export const verifyPaymentSchema = z
  .object({
    razorpayOrderId: z.string().min(1, 'Razorpay Order ID is required'),
    razorpayPaymentId: z.string().min(1, 'Razorpay Payment ID is required'),
    razorpaySignature: z.string().min(1, 'Razorpay Signature is required'),
    planTier: z.enum(['PRO', 'ENTERPRISE']),
    interval: z.enum(['monthly', 'yearly']).default('monthly'),
    currency: z.enum(['INR', 'USD']).default('INR'),
  })
  .strict();

export const portalSchema = z
  .object({
    returnUrl: z.string().url().optional(),
  })
  .strict();
