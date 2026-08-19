// src/modules/organizations/org.schema.js
// ============================================================
// Zod Validation Schemas for Organization endpoints
// ============================================================

import { z } from 'zod';

// Common: list of valid IANA timezone identifiers (sample — full list via Intl)
const timezoneSchema = z
  .string()
  .refine(
    (tz) => {
      try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true; }
      catch { return false; }
    },
    { message: 'Invalid timezone. Use IANA format e.g. "Asia/Kolkata", "UTC".' }
  );

// Common: ISO 4217 currency codes (we accept any 3-letter code)
const currencySchema = z
  .string()
  .length(3, 'Currency must be a 3-letter ISO code (e.g. INR, USD, EUR)')
  .toUpperCase();

// ── Create Organization ────────────────────────────────────────
export const createOrgSchema = z
  .object({
    name: z
      .string({ required_error: 'Organization name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters')
      .trim(),
    industry: z.string().max(100).trim().optional(),
    timezone: timezoneSchema.optional().default('Asia/Kolkata'),
    currency: currencySchema.optional().default('INR'),
  })
  .strict();

// ── Update Organization ────────────────────────────────────────
export const updateOrgSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    industry: z.string().max(100).trim().nullable().optional(),
    timezone: timezoneSchema.optional(),
    currency: currencySchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update.',
  });

// ── Switch Organization ────────────────────────────────────────
export const switchOrgSchema = z
  .object({
    organizationId: z.string({ required_error: 'organizationId is required' }).min(1),
  })
  .strict();
