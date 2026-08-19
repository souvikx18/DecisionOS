// src/modules/products/products.router.js
// ============================================================
// Products Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  listProducts,
  getProductCategories,
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
} from './products.controller.js';

const router = Router();

// All product routes require authentication and organization context
router.use(requireAuth, requireOrg);

// ── Categories (must be before /:id) ──────────────────────────
router.get('/categories/list', requirePermission('VIEW_DATA'), authGeneralLimiter, getProductCategories);

// ── Read endpoints (VIEW_DATA) ────────────────────────────────
router.get('/',                requirePermission('VIEW_DATA'), authGeneralLimiter, listProducts);
router.get('/:id',             requirePermission('VIEW_DATA'), authGeneralLimiter, getProduct);

// ── Write endpoints (MANAGE_DATA) ─────────────────────────────
router.post('/',               requirePermission('MANAGE_DATA'), authGeneralLimiter, createProduct);
router.patch('/:id',           requirePermission('MANAGE_DATA'), authGeneralLimiter, updateProduct);
router.delete('/:id',          requirePermission('MANAGE_DATA'), authGeneralLimiter, archiveProduct);

export default router;
