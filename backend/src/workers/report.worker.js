// src/workers/report.worker.js
// ============================================================
// BullMQ Report Generation Worker
// Processes 'generate-report' jobs from report-generation-queue.
// Called by server.js on startup alongside import.worker.js
// ============================================================

import { Worker } from 'bullmq';
import { bullRedisConnection, REPORT_QUEUE_NAME } from '../config/queue.js';
import { generateReportService }                  from '../modules/reports/reports.service.js';
import { prisma }                                 from '../lib/prisma.js';

let reportWorker = null;

/**
 * Start the Report Generation Worker.
 * Processes one job at a time (concurrency: 1) to avoid
 * memory spikes from simultaneous PDF builds.
 */
export function startReportWorker() {
  reportWorker = new Worker(
    REPORT_QUEUE_NAME,
    async (job) => {
      const { orgId, userId, type, periodStart, periodEnd, formats, emailTo } = job.data;

      console.log(`[ReportWorker] Processing job ${job.id} | type=${type} | org=${orgId}`);

      await generateReportService(orgId, userId, {
        type,
        periodStart,
        periodEnd,
        formats,
        emailTo,
      });

      console.log(`[ReportWorker] ✅ Job ${job.id} completed`);
    },
    {
      connection: bullRedisConnection,
      concurrency: 1, // One PDF at a time to control memory
    }
  );

  reportWorker.on('completed', (job) => {
    console.log(`[ReportWorker] Job ${job.id} finished successfully`);
  });

  reportWorker.on('failed', async (job, err) => {
    console.error(`[ReportWorker] ❌ Job ${job?.id} failed:`, err.message);
    // Mark the report as FAILED in the DB so user sees accurate status
    if (job?.data?.reportId) {
      try {
        await prisma.report.update({
          where: { id: job.data.reportId },
          data: { status: 'FAILED' },
        });
      } catch (dbErr) {
        console.error('[ReportWorker] Failed to update report status:', dbErr.message);
      }
    }
  });

  reportWorker.on('error', (err) => {
    console.error('[ReportWorker] Worker error:', err.message);
  });

  console.log('[ReportWorker] ✅ Report generation worker started');
  return reportWorker;
}

export async function closeReportWorker() {
  if (reportWorker) {
    await reportWorker.close();
    reportWorker = null;
    console.log('[ReportWorker] Worker closed');
  }
}
