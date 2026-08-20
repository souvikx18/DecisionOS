// src/lib/reportBuilder/xlsxBuilder.js
// ============================================================
// XLSX Report Builder — Powered by ExcelJS
// Multi-sheet .xlsx with formatted headers, colored cells,
// column auto-width, and currency number formatting.
// ============================================================

import ExcelJS from 'exceljs';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const ALERT_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
const DANGER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
const OK_FILL     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
const GREEN_ARGB  = 'FF10B981';

function applyAutoWidth(worksheet) {
  worksheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 50);
  });
}

function addHeaderRow(worksheet, headers) {
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 20;
  return headerRow;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Build an .xlsx report as a Buffer.
 * Sheets: Summary, Sales, Expenses, Inventory, Customers, AI Insights
 *
 * @param {object} data - output from reportDataFetcher
 * @returns {Promise<Buffer>}
 */
export async function buildXlsx(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DecisionOS';
  workbook.lastModifiedBy = 'DecisionOS Report Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  const currency = data.org?.currency || 'INR';
  const currencyFormat = currency === 'INR' ? '₹#,##0.00' : '$#,##0.00';

  // ── Sheet 1: Summary ─────────────────────────────────────────
  const summarySheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FF1D4ED8' } },
  });
  summarySheet.columns = [{ width: 30 }, { width: 25 }];

  const metaRows = [
    ['DecisionOS Business Report', ''],
    ['Organization', data.org?.name || ''],
    ['Industry', data.org?.industry || ''],
    ['Currency', currency],
    ['Period Start', formatDate(data.period.start)],
    ['Period End', formatDate(data.period.end)],
    ['Generated', formatDate(new Date())],
    ['', ''],
    ['KPI', 'Value'],
    ['Total Revenue', data.summary.totalRevenue],
    ['Total Expenses', data.summary.totalExpenses],
    ['Gross Profit', data.summary.grossProfit],
    ['Profit Margin %', data.summary.profitMargin],
    ['Total Transactions', data.summary.totalTransactions],
  ];

  metaRows.forEach((row, idx) => {
    const r = summarySheet.addRow(row);
    if (idx === 0) { r.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1D4ED8' } }; }
    if (idx === 8) {
      r.eachCell((cell) => { cell.fill = HEADER_FILL; cell.font = HEADER_FONT; });
    }
    if (idx >= 9) {
      r.getCell(2).numFmt = idx < 13 ? currencyFormat : '0';
      if (idx === 11) {
        r.getCell(2).fill = data.summary.grossProfit >= 0 ? OK_FILL : DANGER_FILL;
      }
    }
  });
  applyAutoWidth(summarySheet);

  // ── Sheet 2: Sales ───────────────────────────────────────────
  const salesSheet = workbook.addWorksheet('Sales', {
    properties: { tabColor: { argb: GREEN_ARGB } },
  });
  addHeaderRow(salesSheet, [
    'Date', 'Customer Name', 'Company', 'Product Name', 'SKU',
    'Category', 'Qty', 'Unit Price', 'Discount', 'Total Amount', 'Channel', 'Region',
  ]);

  data.sales.forEach((s) => {
    const row = salesSheet.addRow([
      formatDate(s.soldAt),
      s.customer?.name || '',
      s.customer?.company || '',
      s.product?.name || '',
      s.product?.sku || '',
      s.product?.category || '',
      s.quantity,
      s.unitPrice,
      s.discount || 0,
      s.totalAmount,
      s.channel || '',
      s.region || '',
    ]);
    row.getCell(8).numFmt = currencyFormat;
    row.getCell(9).numFmt = currencyFormat;
    row.getCell(10).numFmt = currencyFormat;
  });
  salesSheet.autoFilter = { from: 'A1', to: 'L1' };
  applyAutoWidth(salesSheet);

  // ── Sheet 3: Expenses ────────────────────────────────────────
  const expSheet = workbook.addWorksheet('Expenses', {
    properties: { tabColor: { argb: 'FFEF4444' } },
  });
  addHeaderRow(expSheet, ['Date', 'Category', 'Sub-Category', 'Amount', 'Vendor', 'Description']);

  data.expenses.forEach((e) => {
    const row = expSheet.addRow([
      formatDate(e.occurredAt),
      e.category,
      e.subCategory || '',
      e.amount,
      e.vendor || '',
      e.description || '',
    ]);
    row.getCell(4).numFmt = currencyFormat;
  });

  // Expense breakdown summary below
  expSheet.addRow([]);
  expSheet.addRow(['Category Breakdown', '', '', '', '', '']);
  const breakdownHeader = expSheet.addRow(['Category', 'Total', '% of Expenses']);
  breakdownHeader.eachCell((c) => { c.fill = HEADER_FILL; c.font = HEADER_FONT; });
  data.expenseByCategory.forEach((cat) => {
    const pct = data.summary.totalExpenses > 0
      ? ((cat.total / data.summary.totalExpenses) * 100).toFixed(1)
      : '0.0';
    const r = expSheet.addRow([cat.category, cat.total, pct + '%']);
    r.getCell(2).numFmt = currencyFormat;
  });

  expSheet.autoFilter = { from: 'A1', to: 'F1' };
  applyAutoWidth(expSheet);

  // ── Sheet 4: Inventory ───────────────────────────────────────
  const invSheet = workbook.addWorksheet('Inventory', {
    properties: { tabColor: { argb: 'FFF59E0B' } },
  });
  addHeaderRow(invSheet, [
    'SKU', 'Product Name', 'Category', 'Qty On Hand',
    'Reorder Level', 'Reorder Qty', 'Warehouse Location', 'Status', 'Selling Price',
  ]);

  data.inventory.all.forEach((item) => {
    const status = item.quantity === 0
      ? 'OUT OF STOCK'
      : item.quantity <= item.reorderLevel ? 'LOW STOCK' : 'OK';
    const row = invSheet.addRow([
      item.sku,
      item.name,
      item.product?.category || '',
      item.quantity,
      item.reorderLevel,
      item.reorderQty,
      item.warehouseLocation || '',
      status,
      item.product?.sellingPrice || 0,
    ]);
    row.getCell(9).numFmt = currencyFormat;
    if (status === 'OUT OF STOCK') row.eachCell((c) => { c.fill = DANGER_FILL; });
    else if (status === 'LOW STOCK') row.eachCell((c) => { c.fill = ALERT_FILL; });
    else row.getCell(8).fill = OK_FILL;
  });

  invSheet.autoFilter = { from: 'A1', to: 'I1' };
  applyAutoWidth(invSheet);

  // ── Sheet 5: Customers ───────────────────────────────────────
  const custSheet = workbook.addWorksheet('Customers', {
    properties: { tabColor: { argb: 'FF8B5CF6' } },
  });
  addHeaderRow(custSheet, [
    'Name', 'Company', 'Segment', 'Total Revenue', 'Churn Risk %', 'Last Order Date', 'Email',
  ]);

  data.customers.forEach((c) => {
    const churnPct = c.churnRisk ? parseFloat((c.churnRisk * 100).toFixed(1)) : 0;
    const row = custSheet.addRow([
      c.name,
      c.company || '',
      c.segment || '',
      c.totalRevenue,
      churnPct,
      formatDate(c.lastOrderAt),
      c.email || '',
    ]);
    row.getCell(4).numFmt = currencyFormat;
    row.getCell(5).numFmt = '0.0"%"';
    if (churnPct > 70) row.eachCell((c2) => { c2.fill = DANGER_FILL; });
    else if (churnPct > 40) row.eachCell((c2) => { c2.fill = ALERT_FILL; });
  });

  custSheet.autoFilter = { from: 'A1', to: 'G1' };
  applyAutoWidth(custSheet);

  // ── Sheet 6: AI Insights ─────────────────────────────────────
  const aiSheet = workbook.addWorksheet('AI Insights', {
    properties: { tabColor: { argb: 'FF6366F1' } },
  });
  addHeaderRow(aiSheet, ['Severity', 'Type', 'Title', 'Summary', 'Affected Entity', 'Generated At']);

  const sevFillMap = {
    CRITICAL: DANGER_FILL,
    WARNING:  ALERT_FILL,
    GOOD:     OK_FILL,
  };

  data.aiInsights.forEach((i) => {
    const row = aiSheet.addRow([
      i.severity, i.type, i.title, i.summary, i.affectedEntity || '', formatDate(i.generatedAt),
    ]);
    if (sevFillMap[i.severity]) {
      row.getCell(1).fill = sevFillMap[i.severity];
    }
    row.getCell(4).alignment = { wrapText: true };
  });

  aiSheet.getColumn(4).width = 55; // wider summary column
  applyAutoWidth(aiSheet);

  // Serialize to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
