// src/modules/expenses/expenses.router.js
// ============================================================
// Expenses Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  listExpenses,
  getExpenseBreakdown,
  getExpense,
  createExpense,
  updateExpense,
  archiveExpense,
} from './expenses.controller.js';

const router = Router();

// All expense routes require authentication and organization context
router.use(requireAuth, requireOrg);

// ── Breakdown & Summaries (must be before /:id) ───────────────
router.get('/summary/breakdown', requirePermission('VIEW_DATA'), authGeneralLimiter, getExpenseBreakdown);

// ── Read endpoints (VIEW_DATA) ────────────────────────────────
router.get('/',                  requirePermission('VIEW_DATA'), authGeneralLimiter, listExpenses);
router.get('/:id',               requirePermission('VIEW_DATA'), authGeneralLimiter, getExpense);

// ── Write endpoints (MANAGE_DATA) ─────────────────────────────
router.post('/',                 requirePermission('MANAGE_DATA'), authGeneralLimiter, createExpense);
router.patch('/:id',             requirePermission('MANAGE_DATA'), authGeneralLimiter, updateExpense);
router.delete('/:id',            requirePermission('MANAGE_DATA'), authGeneralLimiter, archiveExpense);

export default router;
