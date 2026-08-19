// src/modules/products/products.schema.js
// ============================================================
// Zod Validation Schemas for Products endpoints
// ============================================================

import { z } from 'zod';

// ── Create Product ─────────────────────────────────────────────
export const createProductSchema = z
  .object({
    name: z
      .string({ required_error: 'Product name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(120, 'Name must be at most 120 characters')
      .trim(),
    sku: z.string().max(50).trim().nullable().optional(),
    category: z.string().max(80).trim().nullable().optional(),
    unit: z.string().max(30).trim().nullable().optional().default('pcs'),
    costPrice: z
      .number({ required_error: 'costPrice is required' })
      .min(0, 'Cost price cannot be negative'),
    sellingPrice: z
      .number({ required_error: 'sellingPrice is required' })
      .min(0, 'Selling price cannot be negative'),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

// ── Update Product ─────────────────────────────────────────────
export const updateProductSchema = z
  .object({
    name: z.string().min(2).max(120).trim().optional(),
    sku: z.string().max(50).trim().nullable().optional(),
    category: z.string().max(80).trim().nullable().optional(),
    unit: z.string().max(30).trim().nullable().optional(),
    costPrice: z.number().min(0).optional(),
    sellingPrice: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update.',
  });

// ── Query / List Filter Schema ────────────────────────────────
export const listProductsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.string().optional(),
  isArchived: z.string().optional(),
  sortBy: z.enum(['name', 'sku', 'category', 'costPrice', 'sellingPrice', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
