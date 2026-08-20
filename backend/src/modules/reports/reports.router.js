// src/modules/reports/reports.router.js
// ============================================================
// Report API Routes
// Requires: requireAuth + requireOrg on all routes
// MANAGE_DATA for write/delete, VIEW_DATA for read
// ============================================================

import { Router } from 'express';
import { requireAuth }       from '../../middleware/auth.middleware.js';
import { requireOrg }        from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  generateReport,
  listReports,
  getReport,
  getReportDownloadUrl,
  deleteReport,
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
} from './reports.controller.js';

const router = Router();

// All report routes require authentication and org context
router.use(requireAuth, requireOrg);

// ── Schedules (must be before /:id to avoid route shadowing) ──
router.post(   '/schedules',     requirePermission('MANAGE_DATA'), authGeneralLimiter, createSchedule);
router.get(    '/schedules',     requirePermission('VIEW_DATA'),   authGeneralLimiter, listSchedules);
router.patch(  '/schedules/:id', requirePermission('MANAGE_DATA'), authGeneralLimiter, updateSchedule);
router.delete( '/schedules/:id', requirePermission('MANAGE_DATA'), authGeneralLimiter, deleteSchedule);

// ── On-Demand Report Generation ──────────────────────────────
router.post('/generate', requirePermission('MANAGE_DATA'), authGeneralLimiter, generateReport);

// ── Report Listing & Management ───────────────────────────────
router.get(    '/',                            requirePermission('VIEW_DATA'),   authGeneralLimiter, listReports);
router.get(    '/:id',                         requirePermission('VIEW_DATA'),   authGeneralLimiter, getReport);
router.get(    '/:id/download/:exportId',      requirePermission('VIEW_DATA'),   authGeneralLimiter, getReportDownloadUrl);
router.delete( '/:id',                         requirePermission('MANAGE_DATA'), authGeneralLimiter, deleteReport);

export default router;
