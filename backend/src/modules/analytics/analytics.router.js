// src/modules/analytics/analytics.router.js
// ============================================================
// Executive Analytics Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  getExecutiveSummary,
  getRevenueTrendChart,
  getExpenseBreakdownChart,
} from './analytics.controller.js';

const router = Router();

// All analytics routes require authentication, org context, and VIEW_DATA permission
router.use(requireAuth, requireOrg, requirePermission('VIEW_DATA'));

router.get('/summary',                  authGeneralLimiter, getExecutiveSummary);
router.get('/charts/revenue-trend',     authGeneralLimiter, getRevenueTrendChart);
router.get('/charts/expense-breakdown', authGeneralLimiter, getExpenseBreakdownChart);

export default router;
