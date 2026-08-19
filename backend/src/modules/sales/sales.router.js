// src/modules/sales/sales.router.js
// ============================================================
// Sales Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  listSales,
  getSalesTrends,
  getSale,
  createSale,
  updateSale,
  deleteSale,
} from './sales.controller.js';

const router = Router();

// All sales routes require authentication and organization context
router.use(requireAuth, requireOrg);

// ── Trends & Aggregates (must be before /:id) ─────────────────
router.get('/summary/trends', requirePermission('VIEW_DATA'), authGeneralLimiter, getSalesTrends);

// ── Read endpoints (VIEW_DATA) ────────────────────────────────
router.get('/',               requirePermission('VIEW_DATA'), authGeneralLimiter, listSales);
router.get('/:id',            requirePermission('VIEW_DATA'), authGeneralLimiter, getSale);

// ── Write endpoints (MANAGE_DATA / DELETE_DATA) ───────────────
router.post('/',              requirePermission('MANAGE_DATA'), authGeneralLimiter, createSale);
router.patch('/:id',          requirePermission('MANAGE_DATA'), authGeneralLimiter, updateSale);
router.delete('/:id',         requirePermission('DELETE_DATA'), authGeneralLimiter, deleteSale);

export default router;
