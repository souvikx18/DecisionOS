// src/modules/reports/reports.service.js
// ============================================================
// Report Generation Service — Core Business Logic
// Handles on-demand & scheduled report generation
// ============================================================

import { prisma }              from '../../lib/prisma.js';
import { fetchReportData }     from '../../lib/reportBuilder/reportDataFetcher.js';
import { buildPdf }            from '../../lib/reportBuilder/pdfBuilder.js';
import { buildCsv }            from '../../lib/reportBuilder/csvBuilder.js';
import { buildXlsx }           from '../../lib/reportBuilder/xlsxBuilder.js';
import { sendReportReadyEmail } from '../../lib/email.js';
import { env }                 from '../../config/env.js';

// ── Supabase Storage Client ────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

function getStorageClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

// ── Constants ─────────────────────────────────────────────────

/** 30-day file retention: files in Supabase Storage are purged after this window. */
const FILE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────

/**
 * Calculate the next scheduled run time based on frequency settings.
 */
function calcNextRunAt(frequency, dayOfWeek, dayOfMonth) {
  const now = new Date();

  if (frequency === 'DAILY') {
    // Next day at 06:00 local
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
    return next;
  }

  if (frequency === 'WEEKLY') {
    // Next occurrence of dayOfWeek at 06:00
    const next = new Date(now);
    const currentDay = next.getDay(); // 0 = Sunday
    let daysUntil = (dayOfWeek - currentDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7; // next week if today is that day
    next.setDate(next.getDate() + daysUntil);
    next.setHours(6, 0, 0, 0);
    return next;
  }

  if (frequency === 'MONTHLY') {
    // Next occurrence of dayOfMonth at 06:00
    const next = new Date(now);
    next.setDate(dayOfMonth);
    next.setHours(6, 0, 0, 0);
    if (next <= now) {
      // Already past this month's run date — go to next month
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  return null;
}

/**
 * Calculate the report period based on report type and trigger time.
 */
function calcPeriod(type, triggeredAt) {
  const now = triggeredAt || new Date();

  if (type === 'DAILY_SUMMARY') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (type === 'WEEKLY_REPORT') {
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (type === 'MONTHLY_REPORT') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  return null;
}

/**
 * Upload a Buffer to Supabase Storage.
 * Returns the storage key (path).
 */
async function uploadToStorage(buffer, storageKey, contentType) {
  const supabase = getStorageClient();
  const { error } = await supabase.storage
    .from(env.STORAGE_BUCKET)
    .upload(storageKey, buffer, {
      contentType,
      upsert: false,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storageKey;
}

/**
 * Get a signed download URL (1-hour expiry).
 */
async function getSignedUrl(storageKey) {
  const supabase = getStorageClient();
  const { data, error } = await supabase.storage
    .from(env.STORAGE_BUCKET)
    .createSignedUrl(storageKey, 3600); // 1 hour
  if (error) throw new Error(`Failed to generate signed URL: ${error.message}`);
  return data.signedUrl;
}

// ── Service: Generate On-Demand Report ────────────────────────

/**
 * Generate a report, upload files to storage, create DB records, send email.
 * @param {string} orgId
 * @param {string} userId
 * @param {object} payload - { type, periodStart, periodEnd, formats, emailTo }
 * @returns {Promise<Report>}
 */
export async function generateReportService(orgId, userId, payload) {
  const { type, periodStart, periodEnd, formats, emailTo } = payload;
  const pStart = new Date(periodStart);
  const pEnd   = new Date(periodEnd);

  // 1. Create Report record in PENDING state
  const report = await prisma.report.create({
    data: {
      organizationId: orgId,
      generatedBy: userId,
      type,
      title: buildReportTitle(type, pStart, pEnd),
      status: 'PENDING',
      periodStart: pStart,
      periodEnd: pEnd,
      config: { formats, emailTo },
    },
  });

  // 2. Transition to GENERATING
  await prisma.report.update({ where: { id: report.id }, data: { status: 'GENERATING' } });

  try {
    // 3. Fetch all business data for the period
    const data = await fetchReportData(orgId, pStart, pEnd);

    const exports = [];

    // 4. Build & upload each requested format
    for (const fmt of formats) {
      let buffer, contentType, extension;

      if (fmt === 'PDF') {
        buffer = await buildPdf(data, type);
        contentType = 'application/pdf';
        extension = 'pdf';
      } else if (fmt === 'CSV') {
        buffer = buildCsv(data);
        contentType = 'text/csv';
        extension = 'csv';
      } else if (fmt === 'XLSX') {
        buffer = await buildXlsx(data);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extension = 'xlsx';
      } else {
        continue;
      }

      const storageKey = `reports/${orgId}/${report.id}/${type.toLowerCase()}_${Date.now()}.${extension}`;
      await uploadToStorage(buffer, storageKey, contentType);

      const exportRecord = await prisma.reportExport.create({
        data: {
          reportId: report.id,
          format: fmt,
          storageKey,
          fileSize: buffer.length,
          fileExpiresAt: new Date(Date.now() + FILE_RETENTION_MS), // 30-day retention
        },
      });
      exports.push(exportRecord);
    }

    // 5. Mark READY
    const readyReport = await prisma.report.update({
      where: { id: report.id },
      data: { status: 'READY' },
      include: { exports: true },
    });

    // 6. Send email notification (fire-and-forget, non-blocking)
    if (emailTo && emailTo.length > 0) {
      sendReportReadyEmail({
        recipients: emailTo,
        orgName: data.org?.name,
        reportTitle: readyReport.title,
        reportType: type,
        summary: data.summary,
        currency: data.org?.currency || 'INR',
        exports,
      }).catch((err) => console.error('[Reports] Email send failed:', err.message));
    }

    // 7. Audit log (best-effort)
    try {
      const { logAudit } = await import('../../lib/audit.js');
      await logAudit({ orgId, userId, action: 'DATA_EXPORTED', entityType: 'Report', entityId: report.id });
    } catch (_) { /* non-fatal */ }

    return readyReport;

  } catch (err) {
    // Mark as FAILED
    await prisma.report.update({ where: { id: report.id }, data: { status: 'FAILED' } });
    throw err;
  }
}

// ── Service: List Reports ──────────────────────────────────────

export async function listReportsService(orgId, query) {
  const page  = Math.max(1, parseInt(query.page  || '1'));
  const limit = Math.min(50, parseInt(query.limit || '20'));
  const skip  = (page - 1) * limit;

  const where = { organizationId: orgId };
  if (query.type) where.type = query.type.toUpperCase();
  if (query.status) where.status = query.status.toUpperCase();

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: { exports: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return {
    reports,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Service: Get Single Report ─────────────────────────────────

export async function getReportService(orgId, reportId) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, organizationId: orgId },
    include: { exports: true },
  });
  if (!report) return { notFound: true };
  return { report };
}

// ── Service: Get Signed Download URL ──────────────────────────

export async function getReportDownloadUrlService(orgId, reportId, exportId) {
  // Verify ownership
  const reportExport = await prisma.reportExport.findFirst({
    where: {
      id: exportId,
      report: { id: reportId, organizationId: orgId },
    },
  });
  if (!reportExport) return { notFound: true };

  const signedUrl = await getSignedUrl(reportExport.storageKey);

  // Cache signed URL in DB for 50 min (slightly less than 1hr expiry)
  await prisma.reportExport.update({
    where: { id: exportId },
    data: {
      signedUrl,
      urlExpiresAt: new Date(Date.now() + 50 * 60 * 1000),
    },
  });

  return { download: { signedUrl, format: reportExport.format, fileSize: reportExport.fileSize } };
}

// ── Service: Delete Report ─────────────────────────────────────

export async function deleteReportService(orgId, reportId) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, organizationId: orgId },
    include: { exports: true },
  });
  if (!report) return { notFound: true };

  // Delete files from Supabase Storage
  const supabase = getStorageClient();
  for (const exp of report.exports) {
    await supabase.storage.from(env.STORAGE_BUCKET).remove([exp.storageKey]).catch(() => {});
  }

  // Cascade deletes ReportExport records
  await prisma.report.delete({ where: { id: reportId } });
  return { success: true };
}

// ── Service: Create Schedule ───────────────────────────────────

export async function createScheduleService(orgId, userId, payload) {
  const { type, frequency, formats, emailTo, dayOfWeek, dayOfMonth } = payload;
  const nextRunAt = calcNextRunAt(frequency, dayOfWeek, dayOfMonth);

  return prisma.reportSchedule.create({
    data: {
      organizationId: orgId,
      createdBy: userId,
      type,
      frequency,
      formats,
      emailTo,
      dayOfWeek: dayOfWeek ?? null,
      dayOfMonth: dayOfMonth ?? null,
      nextRunAt,
    },
  });
}

// ── Service: List Schedules ────────────────────────────────────

export async function listSchedulesService(orgId) {
  return prisma.reportSchedule.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Service: Update Schedule ───────────────────────────────────

export async function updateScheduleService(orgId, scheduleId, payload) {
  const schedule = await prisma.reportSchedule.findFirst({
    where: { id: scheduleId, organizationId: orgId },
  });
  if (!schedule) return { notFound: true };

  const updateData = {};
  if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
  if (payload.emailTo)   updateData.emailTo   = payload.emailTo;
  if (payload.formats)   updateData.formats   = payload.formats;
  if (payload.dayOfWeek  !== undefined) updateData.dayOfWeek  = payload.dayOfWeek;
  if (payload.dayOfMonth !== undefined) updateData.dayOfMonth = payload.dayOfMonth;

  // Recalculate nextRunAt if toggling back to active or changing schedule fields
  if (payload.isActive === true || payload.dayOfWeek !== undefined || payload.dayOfMonth !== undefined) {
    const updated = { ...schedule, ...updateData };
    updateData.nextRunAt = calcNextRunAt(updated.frequency, updated.dayOfWeek, updated.dayOfMonth);
  }

  const updatedSchedule = await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: updateData,
  });
  return { schedule: updatedSchedule };
}

// ── Service: Delete Schedule ───────────────────────────────────

export async function deleteScheduleService(orgId, scheduleId) {
  const schedule = await prisma.reportSchedule.findFirst({
    where: { id: scheduleId, organizationId: orgId },
  });
  if (!schedule) return { notFound: true };
  await prisma.reportSchedule.delete({ where: { id: scheduleId } });
  return { success: true };
}

// ── Service: Purge Expired Report Files ───────────────────────

/**
 * Deletes Supabase Storage files whose 30-day retention window has elapsed.
 * Called by the report scheduler (e.g. nightly). Leaves the DB record intact
 * but clears storageKey so the client can detect the file is gone.
 */
export async function purgeExpiredReportFiles() {
  const supabase = getStorageClient();

  const expired = await prisma.reportExport.findMany({
    where: {
      fileExpiresAt: { lte: new Date() },
      storageKey: { not: '' },
    },
    select: { id: true, storageKey: true },
  });

  if (expired.length === 0) return { purged: 0 };

  const keys = expired.map((e) => e.storageKey).filter(Boolean);
  if (keys.length > 0) {
    await supabase.storage.from(env.STORAGE_BUCKET).remove(keys).catch((err) =>
      console.warn('[Reports] Storage purge partial error:', err.message)
    );
  }

  // Clear storageKey + signedUrl so clients know file is gone
  await prisma.reportExport.updateMany({
    where: { id: { in: expired.map((e) => e.id) } },
    data: { storageKey: '', signedUrl: null, urlExpiresAt: null },
  });

  console.log(`[Reports] Purged ${expired.length} expired export file(s).`);
  return { purged: expired.length };
}

// ── Utility ────────────────────────────────────────────────────

function buildReportTitle(type, start, end) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const names = {
    DAILY_SUMMARY:  'Daily Summary',
    WEEKLY_REPORT:  'Weekly Report',
    MONTHLY_REPORT: 'Monthly Report',
    CUSTOM:         'Custom Report',
  };
  return `${names[type] || 'Report'} · ${fmt(start)} – ${fmt(end)}`;
}

// Export internal helper for use by report scheduler
export { calcPeriod, calcNextRunAt };
