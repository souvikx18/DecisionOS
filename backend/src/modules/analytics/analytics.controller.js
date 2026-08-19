// src/modules/analytics/analytics.controller.js
// ============================================================
// Executive Analytics Controllers
// ============================================================

import { sendSuccess } from '../../lib/response.js';
import {
  getExecutiveSummaryService,
  getRevenueTrendChartService,
  getExpenseBreakdownChartService,
} from './analytics.service.js';

// ── GET /api/v1/analytics/summary ──────────────────────────────
export async function getExecutiveSummary(req, res) {
  const data = await getExecutiveSummaryService(req.org.id);
  return sendSuccess(res, data);
}

// ── GET /api/v1/analytics/charts/revenue-trend ─────────────────
export async function getRevenueTrendChart(req, res) {
  const monthsBack = parseInt(req.query.months, 10) || 6;
  const data = await getRevenueTrendChartService(req.org.id, monthsBack);
  return sendSuccess(res, data);
}

// ── GET /api/v1/analytics/charts/expense-breakdown ─────────────
export async function getExpenseBreakdownChart(req, res) {
  const data = await getExpenseBreakdownChartService(req.org.id);
  return sendSuccess(res, data);
}
