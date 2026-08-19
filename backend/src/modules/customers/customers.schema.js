// src/modules/customers/customers.schema.js
// ============================================================
// Zod Validation Schemas for Customers endpoints
// ============================================================

import { z } from 'zod';

// ── Create Customer ────────────────────────────────────────────
export const createCustomerSchema = z
  .object({
    name: z
      .string({ required_error: 'Customer name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters')
      .trim(),
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase()
      .trim()
      .nullable()
      .optional(),
    phone: z.string().max(25).trim().nullable().optional(),
    company: z.string().max(100).trim().nullable().optional(),
    region: z.string().max(50).trim().nullable().optional(),
    segment: z.string().max(50).trim().nullable().optional(),
    churnRisk: z.number().min(0).max(1).nullable().optional(),
    tags: z.array(z.string().trim()).optional().default([]),
    metadata: z.record(z.any()).nullable().optional(),
  })
  .strict();

// ── Update Customer ────────────────────────────────────────────
export const updateCustomerSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    email: z.string().email('Invalid email address').toLowerCase().trim().nullable().optional(),
    phone: z.string().max(25).trim().nullable().optional(),
    company: z.string().max(100).trim().nullable().optional(),
    region: z.string().max(50).trim().nullable().optional(),
    segment: z.string().max(50).trim().nullable().optional(),
    churnRisk: z.number().min(0).max(1).nullable().optional(),
    tags: z.array(z.string().trim()).optional(),
    metadata: z.record(z.any()).nullable().optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update.',
  });

// ── Query / List Filter Schema ────────────────────────────────
export const listCustomersQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  segment: z.string().optional(),
  region: z.string().optional(),
  isArchived: z.string().optional(),
  sortBy: z.enum(['name', 'totalRevenue', 'lastOrderAt', 'churnRisk', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
