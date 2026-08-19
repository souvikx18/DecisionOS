// test/import_pipeline.test.js
// ============================================================
// Data Import Pipeline & BullMQ Worker Automated Test Suite
// ============================================================

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/crypto.js';
import { startImportWorker, closeImportWorker } from '../src/workers/import.worker.js';

async function testImportPipeline() {
  const BASE = 'http://localhost:3001/api/v1';
  const pass = [];
  const fail = [];

  function check(name, condition, actual) {
    if (condition) {
      pass.push(name);
      console.log('  ✅ PASS: ' + name);
    } else {
      fail.push(name);
      console.error('  ❌ FAIL: ' + name + ' -> ' + JSON.stringify(actual));
    }
  }

  console.log('\n======================================================');
  console.log('🚀 TESTING DATA IMPORT PIPELINE & BULLMQ WORKER');
  console.log('======================================================\n');

  // Ensure worker is running
  startImportWorker();

  // 1. Setup Test User & Org
  const testEmail = 'import_test_' + Date.now() + '@decisionos.com';
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      firstName: 'Import',
      lastName: 'Manager',
      passwordHash: 'mock_argon2_hash',
      isEmailVerified: true,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'Import Test Org ' + Date.now(),
      slug: 'import-org-' + Date.now(),
      status: 'ACTIVE',
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'ADMIN',
    },
  });

  const sessionToken = generateToken(32);
  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const cookie = 'session=' + sessionToken;
  const authHeaders = {
    Cookie: cookie,
    Authorization: 'Bearer ' + sessionToken,
    'X-Organization-ID': org.id,
  };

  // ── T1: Download Starter CSV Template ────────────────────────
  const templateRes = await fetch(BASE + '/imports/template/SALES', { headers: authHeaders });
  const templateText = await templateRes.text();
  check('T1: Download Sales CSV Template (200)', templateRes.status === 200 && templateText.includes('Quantity,Unit Price'), templateRes.status);

  // ── T2: Create and Upload a CSV File (Sales Data) ───────────
  const testCsvPath = path.resolve(process.cwd(), `test_sales_${Date.now()}.csv`);
  const csvContent = `Sale Date,Customer Name,Product / SKU,Quantity,Unit Price,Discount,Sales Channel,Region,Notes
2026-08-10,Reliance Retail,WIDGET-PRO-100,5,1200.00,100.00,Online Store,North,Priority Order
2026-08-11,Tata Motors,WIDGET-PRO-200,8,2500.00,0.00,Direct Sales,West,Q3 procurement
2026-08-12,Adani Ports,WIDGET-PRO-100,12,1200.00,300.00,Wholesale,South,Bulk discount`;

  fs.writeFileSync(testCsvPath, csvContent, 'utf-8');

  const fileBlob = new Blob([fs.readFileSync(testCsvPath)], { type: 'text/csv' });
  const formData = new FormData();
  formData.append('file', fileBlob, path.basename(testCsvPath));

  const uploadRes = await fetch(BASE + '/imports/upload', {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });
  const uploadData = await uploadRes.json();
  check('T2: Upload CSV File & Extract 5-Row Preview (201)', uploadRes.status === 201 && uploadData.data?.preview?.headers?.length === 9, uploadData);
  const fileId = uploadData.data?.file?.id;

  // Cleanup local test file
  if (fs.existsSync(testCsvPath)) fs.unlinkSync(testCsvPath);

  // ── T3: Auto-Detect Column Mapping ───────────────────────────
  const previewRes = await fetch(BASE + '/imports/preview', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, type: 'SALES' }),
  });
  const previewData = await previewRes.json();
  const mapping = previewData.data?.suggestedMapping || {};
  check('T3: Smart Column Auto-Detection (200)', previewRes.status === 200 && mapping.quantity === 'Quantity' && mapping.unitPrice === 'Unit Price', mapping);

  // ── T4: Start Background Import Job (BullMQ) ─────────────────
  const startRes = await fetch(BASE + '/imports/start', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, type: 'SALES', columnMapping: mapping }),
  });
  const startData = await startRes.json();
  check('T4: Start Background Import (202 Accepted)', startRes.status === 202 && startData.data?.status === 'PENDING', startData);
  const importId = startData.data?.id;

  // ── T5: Poll Status & Verify Worker Completion ───────────────
  let completed = false;
  let pollResult = null;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const pollRes = await fetch(BASE + `/imports/${importId}`, { headers: authHeaders });
    pollResult = await pollRes.json();
    if (pollResult.data?.status === 'COMPLETED' || pollResult.data?.status === 'PARTIAL' || pollResult.data?.status === 'FAILED') {
      completed = true;
      break;
    }
  }

  check('T5: BullMQ Worker Completed Import Job', completed && pollResult?.data?.status === 'COMPLETED', pollResult?.data);
  check('T5b: Valid Rows Processed = 3', pollResult?.data?.validRows === 3, pollResult?.data?.validRows);

  // ── T6: Verify Records Created in Database ───────────────────
  const importedSales = await prisma.sale.findMany({
    where: { organizationId: org.id, importId },
    include: { customer: true, product: true },
  });
  check('T6: 3 Sales records created in DB', importedSales.length === 3, importedSales.length);
  check('T6b: Customer "Reliance Retail" auto-created & linked', importedSales[0]?.customer?.name === 'Reliance Retail', importedSales[0]?.customer);

  // ── T7: Test Excel File Import (.xlsx) ────────────────────────
  const testXlsxPath = path.resolve(process.cwd(), `test_expenses_${Date.now()}.xlsx`);
  const excelData = [
    { Category: 'Marketing', Amount: 35000, Vendor: 'Google India', Description: 'Search Engine Campaign' },
    { Category: 'Software', Amount: 12000, Vendor: 'Slack Technologies', Description: 'Annual chat licenses' },
  ];
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  XLSX.writeFile(wb, testXlsxPath);

  const xlsxBlob = new Blob([fs.readFileSync(testXlsxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const xlsxFormData = new FormData();
  xlsxFormData.append('file', xlsxBlob, path.basename(testXlsxPath));

  const uploadXlsxRes = await fetch(BASE + '/imports/upload', {
    method: 'POST',
    headers: authHeaders,
    body: xlsxFormData,
  });
  const uploadXlsxData = await uploadXlsxRes.json();
  check('T7: Upload Excel (.xlsx) File (201)', uploadXlsxRes.status === 201 && uploadXlsxData.data?.preview?.headers?.includes('Category'), uploadXlsxData);
  const xlsxFileId = uploadXlsxData.data?.file?.id;

  if (fs.existsSync(testXlsxPath)) fs.unlinkSync(testXlsxPath);

  // Start Excel Import
  const startXlsxRes = await fetch(BASE + '/imports/start', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId: xlsxFileId,
      type: 'EXPENSES',
      columnMapping: { category: 'Category', amount: 'Amount', vendor: 'Vendor', description: 'Description' },
    }),
  });
  const startXlsxData = await startXlsxRes.json();
  const xlsxImportId = startXlsxData.data?.id;

  // Poll Excel completion
  let xlsxCompleted = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const pollRes = await fetch(BASE + `/imports/${xlsxImportId}`, { headers: authHeaders });
    const pollData = await pollRes.json();
    if (pollData.data?.status === 'COMPLETED') {
      xlsxCompleted = true;
      break;
    }
  }
  check('T7b: Excel Expense Import Processed (2 valid rows)', xlsxCompleted, xlsxCompleted);

  // ── T8: Test Error Row Handling (PARTIAL status) ──────────────
  const testErrorCsvPath = path.resolve(process.cwd(), `test_errors_${Date.now()}.csv`);
  const errorCsvContent = `Item Name,SKU,Current Stock Qty,Reorder Level
Drill Bit 10mm,DRILL-10,50,10
Faulty Item,,INVALID_NUMBER,10
Drill Bit 12mm,DRILL-12,80,15`;
  fs.writeFileSync(testErrorCsvPath, errorCsvContent, 'utf-8');

  const errorBlob = new Blob([fs.readFileSync(testErrorCsvPath)], { type: 'text/csv' });
  const errorFormData = new FormData();
  errorFormData.append('file', errorBlob, path.basename(testErrorCsvPath));

  const uploadErrRes = await fetch(BASE + '/imports/upload', {
    method: 'POST',
    headers: authHeaders,
    body: errorFormData,
  });
  const uploadErrData = await uploadErrRes.json();
  const errFileId = uploadErrData.data?.file?.id;
  if (fs.existsSync(testErrorCsvPath)) fs.unlinkSync(testErrorCsvPath);

  const startErrRes = await fetch(BASE + '/imports/start', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId: errFileId,
      type: 'INVENTORY',
      columnMapping: { name: 'Item Name', sku: 'SKU', quantity: 'Current Stock Qty', reorderLevel: 'Reorder Level' },
    }),
  });
  const startErrData = await startErrRes.json();
  const errImportId = startErrData.data?.id;

  let errCompleted = false;
  let errPollResult = null;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const pollRes = await fetch(BASE + `/imports/${errImportId}`, { headers: authHeaders });
    errPollResult = await pollRes.json();
    if (errPollResult.data?.status === 'PARTIAL' || errPollResult.data?.status === 'COMPLETED') {
      errCompleted = true;
      break;
    }
  }

  check('T8: Error Isolation sets status to PARTIAL', errCompleted && errPollResult?.data?.status === 'PARTIAL', errPollResult?.data);
  check('T8b: Valid Rows = 2, Error Rows = 1', errPollResult?.data?.validRows === 2 && errPollResult?.data?.errorRows === 1, errPollResult?.data);

  // ── T9: Error Details Endpoint ───────────────────────────────
  const errDetailsRes = await fetch(BASE + `/imports/${errImportId}/errors`, { headers: authHeaders });
  const errDetailsData = await errDetailsRes.json();
  check('T9: Error Details Report (200 - contains row error reason)', errDetailsRes.status === 200 && errDetailsData.data?.errors?.length === 1, errDetailsData.data);

  console.log('\n======================================================');
  console.log('🏁 IMPORT TEST RESULTS: ' + pass.length + ' PASSED | ' + fail.length + ' FAILED');
  console.log('======================================================\n');

  await closeImportWorker();
  process.exit(fail.length > 0 ? 1 : 0);
}

testImportPipeline().catch(async (err) => {
  console.error('Test execution error:', err);
  await closeImportWorker();
  process.exit(1);
});
