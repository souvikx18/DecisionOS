// src/modules/imports/imports.service.js
// ============================================================
// Data Imports Business Logic
// ============================================================

import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma.js';
import { extractFilePreview } from '../../lib/fileParser.js';
import { autoDetectColumnMapping, IMPORT_SCHEMAS } from '../../lib/columnDetector.js';
import { checkImportLimit } from '../../lib/planLimits.js';
import { addImportJob } from '../../config/queue.js';
import { parsePagination, formatPaginationMeta } from '../../lib/pagination.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';

// Shared select for DataImport
const IMPORT_SELECT = {
  id: true,
  type: true,
  status: true,
  totalRows: true,
  validRows: true,
  errorRows: true,
  columnMapping: true,
  completedAt: true,
  createdAt: true,
  file: {
    select: { id: true, fileName: true, fileSize: true, mimeType: true },
  },
};

// ── 1. UPLOAD FILE & GET INSTANT PREVIEW ───────────────────────
export async function handleFileUploadService(req, orgId, uploadedFile) {
  const userId = req.user.id;

  // 1. Create UploadedFile record in DB
  const dbFile = await prisma.uploadedFile.create({
    data: {
      organizationId: orgId,
      uploadedBy: userId,
      fileName: uploadedFile.originalname,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimetype || 'text/csv',
      storageKey: path.basename(uploadedFile.path),
      storageUrl: uploadedFile.path, // Local filesystem path
    },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      createdAt: true,
    },
  });

  // 2. Extract sample preview (headers + top 5 rows)
  const { headers, rows } = extractFilePreview(uploadedFile.path, uploadedFile.mimetype, 5);

  return {
    file: dbFile,
    preview: {
      headers,
      sampleRows: rows,
      sampleRowCount: rows.length,
    },
  };
}

// ── 2. PREVIEW COLUMN MAPPING SUGGESTIONS ──────────────────────
export async function previewMappingService(orgId, { fileId, type }) {
  const file = await prisma.uploadedFile.findFirst({
    where: { id: fileId, organizationId: orgId },
  });

  if (!file) return { fileNotFound: true };

  // Parse headers from file
  const { headers, rows } = extractFilePreview(file.storageUrl, file.mimeType, 5);

  // Run auto-detection
  const suggestedMapping = autoDetectColumnMapping(headers, type);
  const targetSchema = IMPORT_SCHEMAS[type] || {};

  return {
    fileId: file.id,
    fileName: file.fileName,
    type,
    detectedHeaders: headers,
    suggestedMapping,
    schemaFields: targetSchema.fields || {},
    requiredFields: targetSchema.required || [],
    sampleRows: rows,
  };
}

// ── 3. START BACKGROUND IMPORT JOB ─────────────────────────────
export async function startImportService(req, orgId, { fileId, type, columnMapping }) {
  const userId = req.user.id;

  // 1. Verify File exists & belongs to Org
  const file = await prisma.uploadedFile.findFirst({
    where: { id: fileId, organizationId: orgId },
  });

  if (!file) return { fileNotFound: true };

  // 2. Check Monthly Import Limit
  const quotaCheck = await checkImportLimit(orgId);
  if (!quotaCheck.allowed) {
    return {
      limitReached: true,
      current: quotaCheck.current,
      max: quotaCheck.max,
      tier: quotaCheck.tier,
    };
  }

  // 3. Create DataImport record (status: PENDING)
  const dataImport = await prisma.dataImport.create({
    data: {
      organizationId: orgId,
      fileId,
      importedBy: userId,
      type,
      status: 'PENDING',
      columnMapping,
    },
    select: IMPORT_SELECT,
  });

  // 4. Dispatch job to BullMQ queue
  await addImportJob(dataImport.id, {
    fileId,
    type,
    organizationId: orgId,
    columnMapping,
  });

  await logAudit({
    action: 'DATA_IMPORTED',
    userId,
    orgId,
    entityType: 'DataImport',
    entityId: dataImport.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'IMPORT_QUEUED', type, fileName: file.fileName },
  });

  return { dataImport };
}

// ── 4. LIST IMPORTS (Paginated) ────────────────────────────────
export async function listImportsService(orgId, query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query, {
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  });

  const where = {
    organizationId: orgId,
    ...(query.type && { type: query.type }),
    ...(query.status && { status: query.status }),
  };

  const [imports, total] = await Promise.all([
    prisma.dataImport.findMany({
      where,
      skip,
      take,
      orderBy,
      select: IMPORT_SELECT,
    }),
    prisma.dataImport.count({ where }),
  ]);

  return {
    imports,
    meta: formatPaginationMeta(total, page, limit),
  };
}

// ── 5. GET IMPORT DETAILS & STATUS ─────────────────────────────
export async function getImportDetailsService(orgId, importId) {
  const dataImport = await prisma.dataImport.findFirst({
    where: { id: importId, organizationId: orgId },
    select: {
      ...IMPORT_SELECT,
      errorDetails: true,
    },
  });

  if (!dataImport) return { notFound: true };

  // Omit full error array in summary view, provide top 5 preview errors
  const { errorDetails, ...rest } = dataImport;
  const errorsArray = Array.isArray(errorDetails) ? errorDetails : [];

  return {
    dataImport: {
      ...rest,
      recentErrors: errorsArray.slice(0, 5),
      totalErrorsLogged: errorsArray.length,
    },
  };
}

// ── 6. GET ALL IMPORT ERRORS ───────────────────────────────────
export async function getImportErrorsService(orgId, importId) {
  const dataImport = await prisma.dataImport.findFirst({
    where: { id: importId, organizationId: orgId },
    select: {
      id: true,
      status: true,
      totalRows: true,
      validRows: true,
      errorRows: true,
      errorDetails: true,
    },
  });

  if (!dataImport) return { notFound: true };

  return {
    importId: dataImport.id,
    status: dataImport.status,
    totalRows: dataImport.totalRows,
    errorCount: dataImport.errorRows,
    errors: dataImport.errorDetails || [],
  };
}

// ── 7. CANCEL / DELETE IMPORT ──────────────────────────────────
export async function cancelImportService(req, orgId, importId) {
  const existing = await prisma.dataImport.findFirst({
    where: { id: importId, organizationId: orgId },
    select: { id: true, status: true },
  });

  if (!existing) return { notFound: true };

  // Can only cancel if PENDING or delete if finished
  await prisma.dataImport.delete({ where: { id: importId } });

  return { success: true };
}
