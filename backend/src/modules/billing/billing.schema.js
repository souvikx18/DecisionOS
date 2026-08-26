// src/modules/billing/billing.schema.js
// ============================================================
// Zod Validation Schemas for Billing & Checkout Endpoints
// ============================================================

import { z } from 'zod';

export const checkoutSchema = z
  .object({
    planTier: z.enum(['PRO', 'ENTERPRISE'], {
      required_error: 'Plan tier is required (PRO or ENTERPRISE).',
    }),
    interval: z.enum(['monthly', 'yearly']).default('monthly'),
    currency: z.enum(['INR', 'USD']).default('INR'),
    gateway: z.enum(['stripe', 'razorpay']).default('stripe'),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  })
  .strict();

export const portalSchema = z
  .object({
    returnUrl: z.string().url().optional(),
  })
  .strict();
