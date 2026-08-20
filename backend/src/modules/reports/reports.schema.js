// src/modules/reports/reports.schema.js
// ============================================================
// Zod Validation Schemas for Report endpoints
// ============================================================

import { z } from 'zod';

const REPORT_TYPES  = ['DAILY_SUMMARY', 'WEEKLY_REPORT', 'MONTHLY_REPORT', 'CUSTOM'];
const FREQUENCIES   = ['DAILY', 'WEEKLY', 'MONTHLY'];
const VALID_FORMATS = ['PDF', 'CSV', 'XLSX'];

// ── Generate On-Demand Report ──────────────────────────────────
export const generateReportSchema = z
  .object({
    type: z.enum(REPORT_TYPES, {
      errorMap: () => ({ message: `type must be one of: ${REPORT_TYPES.join(', ')}` }),
    }),
    periodStart: z
      .string({ required_error: 'periodStart is required (ISO 8601 date string)' })
      .datetime({ message: 'periodStart must be a valid ISO 8601 datetime' }),
    periodEnd: z
      .string({ required_error: 'periodEnd is required (ISO 8601 date string)' })
      .datetime({ message: 'periodEnd must be a valid ISO 8601 datetime' }),
    formats: z
      .array(z.enum(VALID_FORMATS))
      .min(1, 'At least one format is required (PDF, CSV, XLSX)')
      .max(3, 'Maximum 3 formats allowed')
      .default(['PDF', 'CSV']),
    emailTo: z
      .array(z.string().email('Each emailTo entry must be a valid email'))
      .optional()
      .default([]),
  })
  .strict()
  .refine(
    (d) => new Date(d.periodStart) < new Date(d.periodEnd),
    { message: 'periodStart must be before periodEnd', path: ['periodStart'] }
  )
  .refine(
    (d) => {
      const diff = new Date(d.periodEnd) - new Date(d.periodStart);
      return diff <= 366 * 24 * 60 * 60 * 1000; // max 1 year window
    },
    { message: 'Period cannot exceed 366 days', path: ['periodEnd'] }
  );

// ── Create Automated Schedule ──────────────────────────────────
export const createScheduleSchema = z
  .object({
    type: z.enum(REPORT_TYPES, {
      errorMap: () => ({ message: `type must be one of: ${REPORT_TYPES.join(', ')}` }),
    }),
    frequency: z.enum(FREQUENCIES, {
      errorMap: () => ({ message: `frequency must be one of: ${FREQUENCIES.join(', ')}` }),
    }),
    formats: z
      .array(z.enum(VALID_FORMATS))
      .min(1, 'At least one format required')
      .default(['PDF', 'CSV']),
    emailTo: z
      .array(z.string().email('Each emailTo entry must be a valid email'))
      .min(1, 'At least one recipient email is required'),
    dayOfWeek: z
      .number()
      .int()
      .min(0)
      .max(6)
      .optional()
      .nullable(), // 0 = Sunday, required for WEEKLY
    dayOfMonth: z
      .number()
      .int()
      .min(1)
      .max(28)
      .optional()
      .nullable(), // required for MONTHLY
  })
  .strict()
  .refine(
    (d) => d.frequency !== 'WEEKLY' || (d.dayOfWeek !== null && d.dayOfWeek !== undefined),
    { message: 'dayOfWeek (0–6) is required for WEEKLY frequency', path: ['dayOfWeek'] }
  )
  .refine(
    (d) => d.frequency !== 'MONTHLY' || (d.dayOfMonth !== null && d.dayOfMonth !== undefined),
    { message: 'dayOfMonth (1–28) is required for MONTHLY frequency', path: ['dayOfMonth'] }
  );

// ── Update Schedule ────────────────────────────────────────────
export const updateScheduleSchema = z
  .object({
    isActive: z.boolean().optional(),
    emailTo: z
      .array(z.string().email())
      .min(1)
      .optional(),
    formats: z
      .array(z.enum(VALID_FORMATS))
      .min(1)
      .optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
    dayOfMonth: z.number().int().min(1).max(28).optional().nullable(),
  })
  .strict()
  .refine(
    (d) => Object.keys(d).length > 0,
    { message: 'At least one field must be provided for update' }
  );

// ── List Reports Query ─────────────────────────────────────────
export const listReportsQuerySchema = z.object({
  type:   z.enum([...REPORT_TYPES, ...REPORT_TYPES.map((t) => t.toLowerCase())]).optional(),
  status: z.enum(['PENDING', 'GENERATING', 'READY', 'FAILED', 'pending', 'generating', 'ready', 'failed']).optional(),
  page:   z.string().optional(),
  limit:  z.string().optional(),
});
