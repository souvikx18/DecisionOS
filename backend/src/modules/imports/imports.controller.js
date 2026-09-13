// src/modules/imports/imports.controller.js
// ============================================================
// Imports Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import { getCsvTemplate } from '../../lib/templateGenerator.js';
import {
  previewImportSchema,
  startImportSchema,
  listImportsQuerySchema,
} from './imports.schema.js';
import {
  handleFileUploadService,
  previewMappingService,
  startImportService,
  listImportsService,
  getImportDetailsService,
  getImportErrorsService,
  cancelImportService,
} from './imports.service.js';

import { parseFullFile } from '../../lib/fileParser.js';
import { autoDetectColumnMapping } from '../../lib/columnDetector.js';
import { prisma } from '../../lib/prisma.js';
import { processSalesRows } from '../../workers/processors/sales.processor.js';
import { processExpensesRows } from '../../workers/processors/expenses.processor.js';
import { processInventoryRows } from '../../workers/processors/inventory.processor.js';
import { processCustomersRows } from '../../workers/processors/customers.processor.js';
import { processProductsRows } from '../../workers/processors/products.processor.js';

// ── 1. POST /api/v1/imports/upload ─────────────────────────────
export async function uploadFile(req, res) {
  if (!req.file) {
    return sendError(res, 400, 'MISSING_FILE', 'Please upload a CSV or Excel (.xlsx / .xls) file.');
  }

  const result = await handleFileUploadService(req, req.org.id, req.file);
  const type = req.body.type?.toUpperCase();

  if (type) {
    try {
      const { rows } = parseFullFile(req.file.path, req.file.mimetype);
      const mapping = autoDetectColumnMapping(result.preview?.headers || [], type);

      const dataImport = await prisma.dataImport.create({
        data: {
          organizationId: req.org.id,
          fileId: result.file.id,
          importedBy: req.user.id,
          type,
          status: 'PROCESSING',
          columnMapping: mapping,
        },
      });

      const processorParams = {
        organizationId: req.org.id,
        importId: dataImport.id,
        rows,
        columnMapping: mapping || {},
      };

      let procResult = { validCount: 0, errorCount: 0, errorDetails: [] };
      switch (type) {
        case 'SALES':
          procResult = await processSalesRows(processorParams);
          break;
        case 'EXPENSES':
          procResult = await processExpensesRows(processorParams);
          break;
        case 'INVENTORY':
          procResult = await processInventoryRows(processorParams);
          break;
        case 'CUSTOMERS':
          procResult = await processCustomersRows(processorParams);
          break;
        case 'PRODUCTS':
          procResult = await processProductsRows(processorParams);
          break;
      }

      let finalStatus = 'COMPLETED';
      if (procResult.validCount === 0 && procResult.errorCount > 0) {
        finalStatus = 'FAILED';
      } else if (procResult.validCount > 0 && procResult.errorCount > 0) {
        finalStatus = 'PARTIAL';
      }

      await prisma.dataImport.update({
        where: { id: dataImport.id },
        data: {
          status: finalStatus,
          totalRows: rows.length,
          validRows: procResult.validCount,
          errorRows: procResult.errorCount,
          errorDetails: procResult.errorDetails?.slice(0, 200) || [],
          completedAt: new Date(),
        },
      });

      return sendSuccess(res, {
        ...result,
        rowsImported: procResult.validCount,
        summary: {
          totalRows: rows.length,
          validRows: procResult.validCount,
          errorRows: procResult.errorCount,
        },
      }, 201, `Imported ${procResult.validCount} rows successfully.`);
    } catch (importErr) {
      console.error('[Upload & Import Error]', importErr);
      return sendSuccess(res, { ...result, rowsImported: 0 }, 201, 'File uploaded.');
    }
  }

  return sendSuccess(res, result, 201, 'File uploaded and parsed successfully.');
}

// ── 2. POST /api/v1/imports/preview ────────────────────────────
export async function previewMapping(req, res) {
  const parsed = previewImportSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await previewMappingService(req.org.id, parsed.data);
  if (result.fileNotFound) {
    return sendError(res, 404, 'FILE_NOT_FOUND', 'Uploaded file not found in your organization.');
  }

  return sendSuccess(res, result);
}

// ── 3. POST /api/v1/imports/start ──────────────────────────────
export async function startImport(req, res) {
  const parsed = startImportSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await startImportService(req, req.org.id, parsed.data);

  if (result.fileNotFound) {
    return sendError(res, 404, 'FILE_NOT_FOUND', 'Uploaded file not found in your organization.');
  }

  if (result.limitReached) {
    return sendError(
      res,
      402,
      'IMPORT_LIMIT_REACHED',
      `Your ${result.tier} plan allows a maximum of ${result.max} imports per month (current: ${result.current}). Please upgrade your plan to import more data.`
    );
  }

  return sendSuccess(res, result.dataImport, 202, 'Import job queued successfully. Processing in background.');
}

// ── 4. GET /api/v1/imports ─────────────────────────────────────
export async function listImports(req, res) {
  const parsed = listImportsQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await listImportsService(req.org.id, parsed.data);
  return sendSuccess(res, result.imports, 200, null, result.meta);
}

// ── 5. GET /api/v1/imports/:id ─────────────────────────────────
export async function getImportDetails(req, res) {
  const result = await getImportDetailsService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'IMPORT_NOT_FOUND', 'Data import record not found.');
  return sendSuccess(res, result.dataImport);
}

// ── 6. GET /api/v1/imports/:id/errors ──────────────────────────
export async function getImportErrors(req, res) {
  const result = await getImportErrorsService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'IMPORT_NOT_FOUND', 'Data import record not found.');
  return sendSuccess(res, result);
}

// ── 7. DELETE /api/v1/imports/:id ──────────────────────────────
export async function cancelImport(req, res) {
  const result = await cancelImportService(req, req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'IMPORT_NOT_FOUND', 'Data import record not found.');
  return sendSuccess(res, null, 200, 'Import record deleted successfully.');
}

// ── 8. GET /api/v1/imports/template/:type ──────────────────────
export async function downloadTemplate(req, res) {
  const { type } = req.params;
  const template = getCsvTemplate(type);

  if (!template) {
    return sendError(
      res,
      400,
      'INVALID_TEMPLATE_TYPE',
      'Invalid template type. Must be one of: SALES, EXPENSES, INVENTORY, CUSTOMERS, PRODUCTS'
    );
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
  return res.status(200).send(template.content);
}
