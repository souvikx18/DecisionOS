// src/modules/ai/ai.schema.js
// ============================================================
// Zod Validation Schemas for AI Engine endpoints
// ============================================================

import { z } from 'zod';

// ── Ask DecisionOS Query Schema ────────────────────────────────
export const askQuerySchema = z
  .object({
    query: z
      .string({ required_error: 'Query prompt is required' })
      .min(3, 'Query must be at least 3 characters')
      .max(1000, 'Query cannot exceed 1000 characters')
      .trim(),
  })
  .strict();

// ── List Insights Filter Query ─────────────────────────────────
export const listInsightsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO', 'GOOD', 'critical', 'warning', 'info', 'good', 'success']).optional(),
  type: z.enum([
    'REVENUE_ANOMALY', 'CHURN_RISK', 'INVENTORY_STOCKOUT',
    'SALES_TREND', 'EXPENSE_SPIKE', 'CUSTOMER_OPPORTUNITY', 'GENERAL',
    'sales', 'inventory', 'churn', 'expense', 'all'
  ]).optional(),
  isRead: z.string().optional(),
  isDismissed: z.string().optional(),
  sortBy: z.enum(['generatedAt', 'severity', 'confidence']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ── Forecast Query ─────────────────────────────────────────────
export const forecastQuerySchema = z.object({
  months: z.string().optional(),
});
