// src/modules/expenses/expenses.schema.js
// ============================================================
// Zod Validation Schemas for Expenses endpoints
// ============================================================

import { z } from 'zod';

// ── Create Expense ─────────────────────────────────────────────
export const createExpenseSchema = z
  .object({
    category: z
      .string({ required_error: 'Expense category is required' })
      .min(2, 'Category must be at least 2 characters')
      .max(60, 'Category must be at most 60 characters')
      .trim(),
    subCategory: z.string().max(60).trim().nullable().optional(),
    amount: z
      .number({ required_error: 'Amount is required' })
      .positive('Expense amount must be greater than 0'),
    description: z.string().max(255).trim().nullable().optional(),
    vendor: z.string().max(100).trim().nullable().optional(),
    receiptUrl: z.string().url('receiptUrl must be a valid URL').nullable().optional(),
    occurredAt: z
      .string()
      .datetime({ message: 'occurredAt must be a valid ISO 8601 date string' })
      .optional(),
  })
  .strict();

// ── Update Expense ─────────────────────────────────────────────
export const updateExpenseSchema = z
  .object({
    category: z.string().min(2).max(60).trim().optional(),
    subCategory: z.string().max(60).trim().nullable().optional(),
    amount: z.number().positive().optional(),
    description: z.string().max(255).trim().nullable().optional(),
    vendor: z.string().max(100).trim().nullable().optional(),
    receiptUrl: z.string().url().nullable().optional(),
    occurredAt: z.string().datetime().optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update.',
  });

// ── Query / List Filter Schema ────────────────────────────────
export const listExpensesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  search: z.string().optional(),
  isArchived: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['occurredAt', 'amount', 'category', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
