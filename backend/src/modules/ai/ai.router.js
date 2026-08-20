// src/modules/ai/ai.router.js
// ============================================================
// AI Engine Routes
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  generateInsights,
  listInsights,
  getInsightsSummary,
  markInsightRead,
  dismissInsight,
  askDecisionOs,
  getRevenueForecast,
  getAiUsageStats,
} from './ai.controller.js';

const router = Router();

// All AI routes require authentication and organization context
router.use(requireAuth, requireOrg);

// ── Static AI Actions & Endpoints (Must be before /:id) ────────
router.post('/generate',           requirePermission('VIEW_DATA'), authGeneralLimiter, generateInsights);
router.post('/insights/generate',  requirePermission('VIEW_DATA'), authGeneralLimiter, generateInsights);
router.post('/ask',                requirePermission('VIEW_DATA'), authGeneralLimiter, askDecisionOs);
router.get('/summary',             requirePermission('VIEW_DATA'), authGeneralLimiter, getInsightsSummary);
router.get('/insights/summary',    requirePermission('VIEW_DATA'), authGeneralLimiter, getInsightsSummary);
router.get('/forecast/revenue',    requirePermission('VIEW_DATA'), authGeneralLimiter, getRevenueForecast);
router.get('/usage',               requirePermission('VIEW_DATA'), authGeneralLimiter, getAiUsageStats);

// ── Insights Listing & Management ──────────────────────────────
router.get('/',                    requirePermission('VIEW_DATA'), authGeneralLimiter, listInsights);
router.get('/insights',            requirePermission('VIEW_DATA'), authGeneralLimiter, listInsights);
router.patch('/insights/:id/read',    requirePermission('VIEW_DATA'), authGeneralLimiter, markInsightRead);
router.patch('/insights/:id/dismiss', requirePermission('VIEW_DATA'), authGeneralLimiter, dismissInsight);
router.patch('/:id/read',             requirePermission('VIEW_DATA'), authGeneralLimiter, markInsightRead);
router.patch('/:id/dismiss',          requirePermission('VIEW_DATA'), authGeneralLimiter, dismissInsight);

export default router;
