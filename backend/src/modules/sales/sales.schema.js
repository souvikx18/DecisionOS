// src/modules/sales/sales.schema.js
// ============================================================
// Zod Validation Schemas for Sales endpoints
// ============================================================

import { z } from 'zod';

// ── Record Sale ────────────────────────────────────────────────
export const createSaleSchema = z
  .object({
    customerId: z.string().trim().nullable().optional(),
    productId: z.string().trim().nullable().optional(),
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1'),
    unitPrice: z
      .number({ required_error: 'unitPrice is required' })
      .min(0, 'Unit price cannot be negative'),
    discount: z.number().min(0, 'Discount cannot be negative').optional().default(0),
    channel: z.string().max(60).trim().nullable().optional(),
    region: z.string().max(60).trim().nullable().optional(),
    soldAt: z
      .string()
      .datetime({ message: 'soldAt must be a valid ISO 8601 date string' })
      .optional(),
    notes: z.string().max(500).trim().nullable().optional(),
    decrementInventory: z.boolean().optional().default(false),
  })
  .strict();

// ── Update Sale ────────────────────────────────────────────────
export const updateSaleSchema = z
  .object({
    channel: z.string().max(60).trim().nullable().optional(),
    region: z.string().max(60).trim().nullable().optional(),
    notes: z.string().max(500).trim().nullable().optional(),
    soldAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update.',
  });

// ── Query / List Filter Schema ────────────────────────────────
export const listSalesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  customerId: z.string().optional(),
  productId: z.string().optional(),
  channel: z.string().optional(),
  region: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['soldAt', 'totalAmount', 'quantity', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
