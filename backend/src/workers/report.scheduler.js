// src/workers/report.scheduler.js
// ============================================================
// Report Schedule Poller
// Runs every 5 minutes via setInterval (server startup).
// Queries due ReportSchedule records → dispatches BullMQ jobs.
// ============================================================

import { prisma }        from '../lib/prisma.js';
import { addReportJob }  from '../config/queue.js';
import { calcPeriod, calcNextRunAt } from '../modules/reports/reports.service.js';

let schedulerInterval = null;
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function runSchedulerTick() {
  const now = new Date();

  try {
    // Find all active schedules where nextRunAt is due (past or now)
    const dueSchedules = await prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
    });

    if (dueSchedules.length === 0) return;

    console.log(`[ReportScheduler] Found ${dueSchedules.length} due schedule(s)`);

    for (const schedule of dueSchedules) {
      try {
        // Calculate the report period for this schedule type
        const period = calcPeriod(schedule.type, now);
        if (!period) {
          console.warn(`[ReportScheduler] Could not determine period for schedule ${schedule.id} (type: ${schedule.type})`);
          continue;
        }

        // Dispatch BullMQ job — report.worker.js will call generateReportService
        const jobId = `sched-${schedule.id}-${now.toISOString().slice(0, 10)}`;
        await addReportJob(jobId, {
          orgId:       schedule.organizationId,
          userId:      schedule.createdBy,
          type:        schedule.type,
          periodStart: period.start.toISOString(),
          periodEnd:   period.end.toISOString(),
          formats:     schedule.formats,
          emailTo:     schedule.emailTo,
        });

        // Update lastRunAt and nextRunAt
        const nextRunAt = calcNextRunAt(schedule.frequency, schedule.dayOfWeek, schedule.dayOfMonth);
        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt,
          },
        });

        console.log(`[ReportScheduler] ✅ Dispatched job for schedule ${schedule.id} | org=${schedule.organizationId} | next run: ${nextRunAt?.toISOString()}`);

      } catch (err) {
        // Log per-schedule errors — don't let one failure block others
        console.error(`[ReportScheduler] ❌ Failed to process schedule ${schedule.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[ReportScheduler] Tick error:', err.message);
  }
}

export function startReportScheduler() {
  // Run immediately on startup to catch any missed schedules
  runSchedulerTick().catch((err) => {
    console.error('[ReportScheduler] Initial tick failed:', err.message);
  });

  schedulerInterval = setInterval(() => {
    runSchedulerTick().catch((err) => {
      console.error('[ReportScheduler] Periodic tick failed:', err.message);
    });
  }, POLL_INTERVAL_MS);

  console.log(`[ReportScheduler] ✅ Report scheduler started (polling every ${POLL_INTERVAL_MS / 60000} min)`);
  return schedulerInterval;
}

export function stopReportScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[ReportScheduler] Scheduler stopped');
  }
}
