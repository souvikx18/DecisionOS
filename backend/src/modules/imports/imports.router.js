// src/modules/imports/imports.router.js
// ============================================================
// Data Imports Routes (with Multer File Upload)
// ============================================================

import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter } from '../../middleware/rateLimit.middleware.js';
import { sendError } from '../../lib/response.js';

import {
  uploadFile,
  previewMapping,
  startImport,
  listImports,
  getImportDetails,
  getImportErrors,
  cancelImport,
  downloadTemplate,
} from './imports.controller.js';

// ── Configure Multer Disk Storage ──────────────────────────────
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `import-${Date.now()}-${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.csv', '.xlsx', '.xls'];

    if (!allowedExts.includes(ext)) {
      return cb(new Error('INVALID_FILE_TYPE: Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.'));
    }
    cb(null, true);
  },
});

// Middleware wrapper for Multer error handling
function handleMulterUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 400, 'FILE_TOO_LARGE', 'Uploaded file exceeds the maximum allowed size of 20MB.');
      }
      return sendError(res, 400, 'UPLOAD_ERROR', err.message);
    }
    next();
  });
}

const router = Router();

// All import routes require authentication and org context
router.use(requireAuth, requireOrg);

// ── 1. Templates (must be before /:id) ─────────────────────────
router.get('/template/:type', requirePermission('VIEW_DATA'), authGeneralLimiter, downloadTemplate);

// ── 2. Upload & Mapping ───────────────────────────────────────
router.post('/upload',  requirePermission('IMPORT_DATA'), authGeneralLimiter, handleMulterUpload, uploadFile);
router.post('/preview', requirePermission('IMPORT_DATA'), authGeneralLimiter, previewMapping);
router.post('/start',   requirePermission('IMPORT_DATA'), authGeneralLimiter, startImport);

// ── 3. Queries & Status ───────────────────────────────────────
router.get('/',            requirePermission('VIEW_DATA'), authGeneralLimiter, listImports);
router.get('/:id',         requirePermission('VIEW_DATA'), authGeneralLimiter, getImportDetails);
router.get('/:id/errors',  requirePermission('VIEW_DATA'), authGeneralLimiter, getImportErrors);
router.delete('/:id',      requirePermission('MANAGE_DATA'), authGeneralLimiter, cancelImport);

export default router;
