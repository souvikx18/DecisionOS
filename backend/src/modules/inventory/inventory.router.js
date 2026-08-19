// src/modules/inventory/inventory.router.js
// ============================================================
// Inventory Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  listInventory,
  getInventoryAlerts,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  archiveInventoryItem,
} from './inventory.controller.js';

const router = Router();

// All inventory routes require authentication and organization context
router.use(requireAuth, requireOrg);

// ── Alerts & Summaries (must be before /:id) ──────────────────
router.get('/summary/alerts', requirePermission('VIEW_DATA'), authGeneralLimiter, getInventoryAlerts);

// ── Read endpoints (VIEW_DATA) ────────────────────────────────
router.get('/',               requirePermission('VIEW_DATA'), authGeneralLimiter, listInventory);
router.get('/:id',            requirePermission('VIEW_DATA'), authGeneralLimiter, getInventoryItem);

// ── Write endpoints (MANAGE_DATA) ─────────────────────────────
router.post('/',              requirePermission('MANAGE_DATA'), authGeneralLimiter, createInventoryItem);
router.patch('/:id',          requirePermission('MANAGE_DATA'), authGeneralLimiter, updateInventoryItem);
router.post('/:id/adjust',    requirePermission('MANAGE_DATA'), authGeneralLimiter, adjustStock);
router.delete('/:id',         requirePermission('MANAGE_DATA'), authGeneralLimiter, archiveInventoryItem);

export default router;
