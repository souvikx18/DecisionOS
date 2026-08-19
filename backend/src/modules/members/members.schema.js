// src/modules/members/members.schema.js
// ============================================================
// Zod Validation Schemas for Member endpoints
// ============================================================

import { z } from 'zod';

// Roles that can be assigned (OWNER is NOT assignable via API)
const assignableRoleSchema = z.enum(['ADMIN', 'ANALYST', 'VIEWER'], {
  errorMap: () => ({ message: 'Role must be one of: ADMIN, ANALYST, VIEWER' }),
});

// ── Change Member Role ─────────────────────────────────────────
export const changeRoleSchema = z
  .object({
    role: assignableRoleSchema,
  })
  .strict();
