// src/modules/customers/customers.router.js
// ============================================================
// Customers Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  listCustomers,
  getCustomerMetrics,
  getCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
} from './customers.controller.js';

const router = Router();

// All customer routes require authentication and organization context
router.use(requireAuth, requireOrg);

// ── Metrics & Summary (must be before /:id) ───────────────────
router.get('/summary/metrics', requirePermission('VIEW_DATA'), authGeneralLimiter, getCustomerMetrics);

// ── Read endpoints (VIEW_DATA) ────────────────────────────────
router.get('/',               requirePermission('VIEW_DATA'), authGeneralLimiter, listCustomers);
router.get('/:id',            requirePermission('VIEW_DATA'), authGeneralLimiter, getCustomer);

// ── Write endpoints (MANAGE_DATA) ─────────────────────────────
router.post('/',              requirePermission('MANAGE_DATA'), authGeneralLimiter, createCustomer);
router.patch('/:id',          requirePermission('MANAGE_DATA'), authGeneralLimiter, updateCustomer);
router.delete('/:id',         requirePermission('MANAGE_DATA'), authGeneralLimiter, archiveCustomer);

export default router;
