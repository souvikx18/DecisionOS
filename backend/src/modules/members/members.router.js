// src/modules/members/members.router.js
// ============================================================
// Members Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  listMembers, getMember, changeRole, removeMember, leaveOrg,
} from './members.controller.js';

const router = Router();

// All member routes: auth + org context
router.use(requireAuth, requireOrg);

// ── View routes (VIEWER and above) ────────────────────────────
router.get('/',     requirePermission('VIEW_DATA'), authGeneralLimiter, listMembers);
router.get('/:id',  requirePermission('VIEW_DATA'), authGeneralLimiter, getMember);

// ── Leave (any authenticated member) ──────────────────────────
// NOTE: /me/leave must be BEFORE /:id to avoid being caught by it
router.delete('/me/leave', authGeneralLimiter, leaveOrg);

// ── Management routes (ADMIN and above) ───────────────────────
router.patch('/:id/role',  requirePermission('MANAGE_MEMBERS'), authGeneralLimiter, changeRole);
router.delete('/:id',      requirePermission('MANAGE_MEMBERS'), authGeneralLimiter, removeMember);

export default router;
