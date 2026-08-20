// src/modules/ai/ai.controller.js
// ============================================================
// AI Engine Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import {
  askQuerySchema,
  listInsightsQuerySchema,
  forecastQuerySchema,
} from './ai.schema.js';
import {
  generateOrgInsightsService,
  listInsightsService,
  getInsightsSummaryService,
  markInsightReadService,
  dismissInsightService,
  askDecisionOsService,
  getRevenueForecastService,
  getAiUsageStatsService,
} from './ai.service.js';

// ── POST /api/v1/ai/generate ───────────────────────────────────
export async function generateInsights(req, res) {
  const result = await generateOrgInsightsService(req.org.id, req.user.id);
  return sendSuccess(res, result, 201, 'AI insights generated and business parameters re-analyzed.');
}

// ── GET /api/v1/ai/insights ────────────────────────────────────
export async function listInsights(req, res) {
  const parsed = listInsightsQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await listInsightsService(req.org.id, parsed.data);
  return sendSuccess(res, result.insights, 200, null, result.meta);
}

// ── GET /api/v1/ai/insights/summary ────────────────────────────
export async function getInsightsSummary(req, res) {
  const result = await getInsightsSummaryService(req.org.id);
  return sendSuccess(res, result);
}

// ── PATCH /api/v1/ai/insights/:id/read ─────────────────────────
export async function markInsightRead(req, res) {
  const result = await markInsightReadService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'INSIGHT_NOT_FOUND', 'Insight record not found.');
  return sendSuccess(res, result.insight, 200, 'Insight marked as read.');
}

// ── PATCH /api/v1/ai/insights/:id/dismiss ──────────────────────
export async function dismissInsight(req, res) {
  const result = await dismissInsightService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'INSIGHT_NOT_FOUND', 'Insight record not found.');
  return sendSuccess(res, result.insight, 200, 'Insight dismissed.');
}

// ── POST /api/v1/ai/ask ────────────────────────────────────────
export async function askDecisionOs(req, res) {
  const parsed = askQuerySchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await askDecisionOsService(req.org.id, req.user.id, parsed.data.query);

  if (result.limitReached) {
    return sendError(
      res,
      402,
      'AI_LIMIT_REACHED',
      `Your ${result.tier} plan allows a maximum of ${result.max} AI calls per month (current: ${result.current}). Please upgrade your plan to unlock unlimited AI queries.`
    );
  }

  return sendSuccess(res, result);
}

// ── GET /api/v1/ai/forecast/revenue ────────────────────────────
export async function getRevenueForecast(req, res) {
  const parsed = forecastQuerySchema.safeParse(req.query);
  const months = parsed.success && parsed.data.months ? parseInt(parsed.data.months, 10) : 3;

  const result = await getRevenueForecastService(req.org.id, months);
  return sendSuccess(res, result);
}

// ── GET /api/v1/ai/usage ───────────────────────────────────────
export async function getAiUsageStats(req, res) {
  const result = await getAiUsageStatsService(req.org.id);
  return sendSuccess(res, result);
}
