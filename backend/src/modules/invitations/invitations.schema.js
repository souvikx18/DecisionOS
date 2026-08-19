// src/modules/invitations/invitations.schema.js
// ============================================================
// Zod Validation Schemas for Invitation endpoints
// ============================================================

import { z } from 'zod';

// Roles that can be invited (OWNER cannot be invited)
const invitableRoleSchema = z.enum(['ADMIN', 'ANALYST', 'VIEWER'], {
  errorMap: () => ({ message: 'Role must be one of: ADMIN, ANALYST, VIEWER' }),
});

// ── Send Invitation ────────────────────────────────────────────
export const sendInvitationSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please enter a valid email address')
      .toLowerCase()
      .trim(),
    role: invitableRoleSchema,
  })
  .strict();

// ── Accept Invitation (for new users who need to create account) ─
export const acceptInvitationSchema = z
  .object({
    token: z.string({ required_error: 'Invitation token is required' }).min(1),
    // Optional: only required if user doesn't have an account yet
    firstName: z.string().min(2).max(50).trim().optional(),
    lastName: z.string().min(2).max(50).trim().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character')
      .optional(),
  })
  .strict();

// ── Preview Invitation (GET check) ────────────────────────────
export const previewInvitationSchema = z.object({
  token: z.string().min(1),
});
