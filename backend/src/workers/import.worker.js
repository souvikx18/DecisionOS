// src/workers/import.worker.js
// ============================================================
// BullMQ Import Worker Consumer
// Background worker processing CSV & Excel import jobs
// ============================================================

import { Worker } from 'bullmq';
import { IMPORT_QUEUE_NAME, bullRedisConnection } from '../config/queue.js';
import { prisma } from '../lib/prisma.js';
import { parseFullFile } from '../lib/fileParser.js';
import { logAudit } from '../lib/audit.js';
import { broadcastToOrg } from '../lib/realtime.js';

import { processSalesRows } from './processors/sales.processor.js';
import { processExpensesRows } from './processors/expenses.processor.js';
import { processInventoryRows } from './processors/inventory.processor.js';
import { processCustomersRows } from './processors/customers.processor.js';
import { processProductsRows } from './processors/products.processor.js';

let importWorkerInstance = null;

/**
 * Main job processor function
 */
async function processImportJob(job) {
  const { dataImportId } = job.data;
  console.log(`[Import Worker] 🚀 Starting job ${job.id} for DataImport ${dataImportId}`);

  // 1. Fetch import record & file
  const dataImport = await prisma.dataImport.findUnique({
    where: { id: dataImportId },
    include: { file: true },
  });

  if (!dataImport) {
    throw new Error(`DataImport record ${dataImportId} not found.`);
  }

  const { organizationId, type, columnMapping, file } = dataImport;

  // 2. Set status to PROCESSING
  await prisma.dataImport.update({
    where: { id: dataImportId },
    data: { status: 'PROCESSING' },
  });

  await job.updateProgress(10);

  try {
    // 3. Parse full file
    const { rows } = parseFullFile(file.storageUrl, file.mimeType);

    if (!rows || rows.length === 0) {
      await prisma.dataImport.update({
        where: { id: dataImportId },
        data: {
          status: 'FAILED',
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          errorDetails: [{ error: 'Uploaded file is empty or contains no data rows.' }],
          completedAt: new Date(),
        },
      });
      return { status: 'EMPTY_FILE' };
    }

    await job.updateProgress(30);

    // 4. Delegate to entity-specific batch processor
    let result = { validCount: 0, errorCount: 0, errorDetails: [] };

    const processorParams = {
      organizationId,
      importId: dataImportId,
      rows,
      columnMapping: columnMapping || {},
    };

    switch (type) {
      case 'SALES':
        result = await processSalesRows(processorParams);
        break;
      case 'EXPENSES':
        result = await processExpensesRows(processorParams);
        break;
      case 'INVENTORY':
        result = await processInventoryRows(processorParams);
        break;
      case 'CUSTOMERS':
        result = await processCustomersRows(processorParams);
        break;
      case 'PRODUCTS':
        result = await processProductsRows(processorParams);
        break;
      default:
        throw new Error(`Unsupported import type: ${type}`);
    }

    await job.updateProgress(90);

    // 5. Determine final status
    let finalStatus = 'COMPLETED';
    if (result.validCount === 0 && result.errorCount > 0) {
      finalStatus = 'FAILED';
    } else if (result.validCount > 0 && result.errorCount > 0) {
      finalStatus = 'PARTIAL';
    }

    // 6. Update database record
    await prisma.dataImport.update({
      where: { id: dataImportId },
      data: {
        status: finalStatus,
        totalRows: rows.length,
        validRows: result.validCount,
        errorRows: result.errorCount,
        errorDetails: result.errorDetails.slice(0, 200), // Cap error log at 200 items for DB size
        completedAt: new Date(),
      },
    });

    await logAudit({
      action: 'DATA_IMPORTED',
      userId: dataImport.importedBy,
      orgId: organizationId,
      entityType: 'DataImport',
      entityId: dataImportId,
      metadata: {
        type,
        status: finalStatus,
        totalRows: rows.length,
        validRows: result.validCount,
        errorRows: result.errorCount,
      },
    });

    // 7. Emit Real-Time WebSocket event to Organization
    broadcastToOrg(organizationId, 'IMPORT_COMPLETED', {
      importId: dataImportId,
      type,
      status: finalStatus,
      totalRows: rows.length,
      validRows: result.validCount,
      errorRows: result.errorCount,
      completedAt: new Date().toISOString(),
    });

    await job.updateProgress(100);
    console.log(`[Import Worker] ✅ Completed job ${job.id}: ${finalStatus} (${result.validCount} valid, ${result.errorCount} errors)`);

    return {
      status: finalStatus,
      total: rows.length,
      valid: result.validCount,
      errors: result.errorCount,
    };
  } catch (err) {
    console.error(`[Import Worker] ❌ Fatal error on job ${job.id}:`, err);

    await prisma.dataImport.update({
      where: { id: dataImportId },
      data: {
        status: 'FAILED',
        errorDetails: [{ error: err.message || 'Fatal processing error occurred.' }],
        completedAt: new Date(),
      },
    });

    throw err;
  }
}

/**
 * Initialize and start the BullMQ worker daemon
 */
export function startImportWorker() {
  if (importWorkerInstance) return importWorkerInstance;

  importWorkerInstance = new Worker(IMPORT_QUEUE_NAME, processImportJob, {
    connection: bullRedisConnection,
    concurrency: 3, // Process up to 3 files concurrently
  });

  importWorkerInstance.on('ready', () => {
    console.log('[Import Worker] ⚙️  Worker ready and listening on queue:', IMPORT_QUEUE_NAME);
  });

  importWorkerInstance.on('failed', (job, err) => {
    console.error(`[Import Worker] ⚠️  Job ${job?.id} failed:`, err.message);
  });

  importWorkerInstance.on('error', (err) => {
    console.error('[Import Worker] ❌ Worker error:', err.message);
  });

  return importWorkerInstance;
}

/**
 * Graceful shutdown for worker
 */
export async function closeImportWorker() {
  if (importWorkerInstance) {
    await importWorkerInstance.close();
    importWorkerInstance = null;
  }
}
