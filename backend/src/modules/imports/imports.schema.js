// src/modules/imports/imports.schema.js
// ============================================================
// Zod Validation Schemas for Data Import Pipeline
// ============================================================

import { z } from 'zod';

const importTypeSchema = z.enum(['SALES', 'EXPENSES', 'INVENTORY', 'CUSTOMERS', 'PRODUCTS'], {
  errorMap: () => ({ message: 'Type must be one of: SALES, EXPENSES, INVENTORY, CUSTOMERS, PRODUCTS' }),
});

// ── Preview Request ────────────────────────────────────────────
export const previewImportSchema = z
  .object({
    fileId: z.string({ required_error: 'fileId is required' }).min(1),
    type: importTypeSchema,
  })
  .strict();

// ── Start Import Request ───────────────────────────────────────
export const startImportSchema = z
  .object({
    fileId: z.string({ required_error: 'fileId is required' }).min(1),
    type: importTypeSchema,
    columnMapping: z.record(z.string()).refine((mapping) => Object.keys(mapping).length > 0, {
      message: 'Column mapping cannot be empty. Please map at least one column.',
    }),
  })
  .strict();

// ── List Imports Query ─────────────────────────────────────────
export const listImportsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.enum(['SALES', 'EXPENSES', 'INVENTORY', 'CUSTOMERS', 'PRODUCTS']).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED']).optional(),
  sortBy: z.enum(['createdAt', 'completedAt', 'totalRows', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
