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

// ── 1. POST /api/v1/imports/upload ─────────────────────────────
export async function uploadFile(req, res) {
  if (!req.file) {
    return sendError(res, 400, 'MISSING_FILE', 'Please upload a CSV or Excel (.xlsx / .xls) file.');
  }

  const result = await handleFileUploadService(req, req.org.id, req.file);
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
