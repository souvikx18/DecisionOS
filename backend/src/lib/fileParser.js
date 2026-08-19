// src/lib/fileParser.js
// ============================================================
// File Parser (CSV & Excel .xlsx / .xls)
// ============================================================

import fs from 'fs';
import { parse as parseCsvSync } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

/**
 * Normalizes header string (trims, removes BOM, lowercases for comparison)
 */
function cleanHeader(header) {
  return String(header || '')
    .trim()
    .replace(/^\uFEFF/, ''); // Remove UTF-8 BOM if present
}

/**
 * Parse a CSV file or buffer into rows
 * @param {string | Buffer} input - File path or buffer
 * @param {object} [options]
 * @param {number} [options.limit] - Max rows to return
 */
export function parseCsv(input, options = {}) {
  const content = Buffer.isBuffer(input) ? input : fs.readFileSync(input);

  const records = parseCsvSync(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    to: options.limit ? options.limit + 1 : undefined, // +1 because headers count
  });

  if (!records || records.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = Object.keys(records[0] || {});
  const headers = rawHeaders.map(cleanHeader);

  const rows = records.slice(0, options.limit || records.length);

  return { headers, rows };
}

/**
 * Parse an Excel file (.xlsx or .xls)
 * @param {string | Buffer} input - File path or buffer
 * @param {object} [options]
 * @param {number} [options.limit] - Max rows to return
 */
export function parseExcel(input, options = {}) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { headers: [], rows: [] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  if (!jsonData || jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = jsonData[0] || [];
  const headers = rawHeaders.map(cleanHeader).filter(Boolean);

  const rows = [];
  const dataRows = jsonData.slice(1);
  const maxRows = options.limit ? Math.min(options.limit, dataRows.length) : dataRows.length;

  for (let i = 0; i < maxRows; i++) {
    const rowArray = dataRows[i];
    if (!rowArray || rowArray.every((cell) => cell === '' || cell === null)) continue;

    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = rowArray[index] !== undefined ? String(rowArray[index]).trim() : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Universal preview extractor for both CSV and Excel files
 * @param {string} filePath - Path to file
 * @param {string} mimeType - File mime type or extension
 * @param {number} [maxPreviewRows=5]
 */
export function extractFilePreview(filePath, mimeType, maxPreviewRows = 5) {
  const isExcel =
    mimeType?.includes('sheet') ||
    mimeType?.includes('excel') ||
    filePath.endsWith('.xlsx') ||
    filePath.endsWith('.xls');

  if (isExcel) {
    return parseExcel(filePath, { limit: maxPreviewRows });
  }

  return parseCsv(filePath, { limit: maxPreviewRows });
}

/**
 * Universal full file parser for workers
 * @param {string} filePath - Path to file
 * @param {string} mimeType - File mime type or extension
 */
export function parseFullFile(filePath, mimeType) {
  const isExcel =
    mimeType?.includes('sheet') ||
    mimeType?.includes('excel') ||
    filePath.endsWith('.xlsx') ||
    filePath.endsWith('.xls');

  if (isExcel) {
    return parseExcel(filePath);
  }

  return parseCsv(filePath);
}
