// src/modules/organizations/org.router.js
// ============================================================
// Organization Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  createOrg, getOrg, updateOrg, getMyOrgs, deleteOrg,
} from './org.controller.js';

const router = Router();

// All org routes require authentication
router.use(requireAuth);

// ── Auth-only routes (no org context needed yet) ───────────────
router.post('/',         authGeneralLimiter, createOrg);       // Create new org
router.get('/my-orgs',  authGeneralLimiter, getMyOrgs);        // List all user's orgs

// ── Org-scoped routes (require org context + permissions) ──────
router.get('/me',
  requireOrg,
  requirePermission('VIEW_DATA'),
  authGeneralLimiter,
  getOrg
);

router.patch('/me',
  requireOrg,
  requirePermission('MANAGE_ORG'),
  authGeneralLimiter,
  updateOrg
);

router.delete('/me',
  requireOrg,
  requirePermission('DELETE_ORG'),
  authGeneralLimiter,
  deleteOrg
);

export default router;
