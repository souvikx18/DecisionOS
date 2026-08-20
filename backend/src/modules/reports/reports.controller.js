// src/modules/reports/reports.controller.js
// ============================================================
// Report API Controllers
// All async errors bubble up to the global error handler.
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import {
  generateReportSchema,
  createScheduleSchema,
  updateScheduleSchema,
  listReportsQuerySchema,
} from './reports.schema.js';
import {
  generateReportService,
  listReportsService,
  getReportService,
  getReportDownloadUrlService,
  deleteReportService,
  createScheduleService,
  listSchedulesService,
  updateScheduleService,
  deleteScheduleService,
} from './reports.service.js';

// ── POST /api/v1/reports/generate ─────────────────────────────
export async function generateReport(req, res) {
  const parsed = generateReportSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const report = await generateReportService(req.org.id, req.user.id, parsed.data);
  return sendSuccess(res, report, 201, 'Report generated successfully.');
}

// ── GET /api/v1/reports ────────────────────────────────────────
export async function listReports(req, res) {
  const parsed = listReportsQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await listReportsService(req.org.id, parsed.data);
  return sendSuccess(res, result.reports, 200, null, result.pagination);
}

// ── GET /api/v1/reports/:id ────────────────────────────────────
export async function getReport(req, res) {
  const result = await getReportService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'REPORT_NOT_FOUND', 'Report not found.');
  return sendSuccess(res, result.report);
}

// ── GET /api/v1/reports/:id/download/:exportId ────────────────
export async function getReportDownloadUrl(req, res) {
  const result = await getReportDownloadUrlService(
    req.org.id,
    req.params.id,
    req.params.exportId
  );
  if (result.notFound) return sendError(res, 404, 'EXPORT_NOT_FOUND', 'Export or report not found.');
  return sendSuccess(res, result.download);
}

// ── DELETE /api/v1/reports/:id ─────────────────────────────────
export async function deleteReport(req, res) {
  const result = await deleteReportService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'REPORT_NOT_FOUND', 'Report not found.');
  return res.status(204).end();
}

// ── POST /api/v1/reports/schedules ────────────────────────────
export async function createSchedule(req, res) {
  const parsed = createScheduleSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const schedule = await createScheduleService(req.org.id, req.user.id, parsed.data);
  return sendSuccess(res, schedule, 201, 'Report schedule created.');
}

// ── GET /api/v1/reports/schedules ─────────────────────────────
export async function listSchedules(req, res) {
  const schedules = await listSchedulesService(req.org.id);
  return sendSuccess(res, schedules);
}

// ── PATCH /api/v1/reports/schedules/:id ───────────────────────
export async function updateSchedule(req, res) {
  const parsed = updateScheduleSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await updateScheduleService(req.org.id, req.params.id, parsed.data);
  if (result.notFound) return sendError(res, 404, 'SCHEDULE_NOT_FOUND', 'Schedule not found.');
  return sendSuccess(res, result.schedule, 200, 'Schedule updated.');
}

// ── DELETE /api/v1/reports/schedules/:id ──────────────────────
export async function deleteSchedule(req, res) {
  const result = await deleteScheduleService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'SCHEDULE_NOT_FOUND', 'Schedule not found.');
  return res.status(204).end();
}
