// src/config/queue.js
// ============================================================
// BullMQ Queue Configuration & Singletons
// ============================================================

import { Queue } from 'bullmq';
import { env } from './env.js';

// Redis connection configuration for BullMQ
// BullMQ requires maxRetriesPerRequest to be null
export const bullRedisConnection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// ── 1. Data Import Queue ───────────────────────────────────────
export const IMPORT_QUEUE_NAME = 'data-import-queue';

export const importQueue = new Queue(IMPORT_QUEUE_NAME, {
  connection: bullRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 500,     // Keep last 500
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days for debugging
    },
  },
});

/**
 * Helper to dispatch import job to background worker
 */
export async function addImportJob(dataImportId, payload) {
  return importQueue.add(
    'process-import',
    {
      dataImportId,
      ...payload,
    },
    {
      jobId: `import-${dataImportId}`,
    }
  );
}
