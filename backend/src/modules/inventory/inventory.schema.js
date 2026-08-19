// src/modules/inventory/inventory.schema.js
// ============================================================
// Zod Validation Schemas for Inventory endpoints
// ============================================================

import { z } from 'zod';

// ── Create Inventory Item ──────────────────────────────────────
export const createInventoryItemSchema = z
  .object({
    productId: z.string().trim().nullable().optional(),
    name: z
      .string({ required_error: 'Item name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(120, 'Name must be at most 120 characters')
      .trim(),
    sku: z.string().max(50).trim().nullable().optional(),
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(0, 'Quantity cannot be negative')
      .default(0),
    reorderLevel: z.number().int().min(0).optional().default(0),
    reorderQty: z.number().int().min(0).optional().default(0),
    warehouseLocation: z.string().max(100).trim().nullable().optional(),
  })
  .strict();

// ── Update Inventory Item ──────────────────────────────────────
export const updateInventoryItemSchema = z
  .object({
    name: z.string().min(2).max(120).trim().optional(),
    sku: z.string().max(50).trim().nullable().optional(),
    quantity: z.number().int().min(0).optional(),
    reorderLevel: z.number().int().min(0).optional(),
    reorderQty: z.number().int().min(0).optional(),
    warehouseLocation: z.string().max(100).trim().nullable().optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update.',
  });

// ── Quick Stock Adjustment Schema ──────────────────────────────
export const adjustStockSchema = z
  .object({
    adjustment: z
      .number({ required_error: 'adjustment is required' })
      .int('Adjustment must be an integer (e.g. +10, -5)')
      .refine((val) => val !== 0, { message: 'Adjustment cannot be 0' }),
    reason: z.string().max(200).trim().optional().default('Manual stock adjustment'),
  })
  .strict();

// ── Query / List Filter Schema ────────────────────────────────
export const listInventoryQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  lowStockOnly: z.string().optional(),
  warehouseLocation: z.string().optional(),
  isArchived: z.string().optional(),
  sortBy: z.enum(['quantity', 'name', 'reorderLevel', 'lastRestockedAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
