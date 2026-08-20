// src/lib/reportBuilder/csvBuilder.js
// ============================================================
// CSV Report Builder — Streaming, Memory-Efficient
// Generates 4-sheet CSV data: Sales, Expenses, Inventory, Customers
// ============================================================

/**
 * Serialize a 2D array into a CSV string.
 * Properly escapes fields containing commas, quotes, or newlines.
 */
function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const str = cell === null || cell === undefined ? '' : String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        })
        .join(',')
    )
    .join('\r\n');
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

function formatAmount(n) {
  return n === null || n === undefined ? '' : Number(n).toFixed(2);
}

/**
 * Build a multi-section CSV report as a Buffer.
 * Sections are separated by blank lines and a section header comment.
 *
 * @param {object} data - output from reportDataFetcher
 * @returns {Buffer}
 */
export function buildCsv(data) {
  const sections = [];
  const currency = data.org?.currency || 'INR';

  // ── Section Meta ────────────────────────────────────────────
  sections.push(toCsv([
    ['DecisionOS — Business Report'],
    ['Organization', data.org?.name || ''],
    ['Industry', data.org?.industry || ''],
    ['Currency', currency],
    ['Period Start', formatDate(data.period.start)],
    ['Period End', formatDate(data.period.end)],
    ['Generated', formatDate(new Date())],
    [],
    ['Executive Summary'],
    ['Total Revenue', formatAmount(data.summary.totalRevenue)],
    ['Total Expenses', formatAmount(data.summary.totalExpenses)],
    ['Gross Profit', formatAmount(data.summary.grossProfit)],
    ['Profit Margin %', data.summary.profitMargin + '%'],
    ['Total Transactions', data.summary.totalTransactions],
    [],
  ]));

  // ── Section 1 — Sales ───────────────────────────────────────
  sections.push(toCsv([
    ['=== SALES ==='],
    ['Date', 'Customer Name', 'Customer Company', 'Product Name', 'Product SKU',
     'Category', 'Quantity', 'Unit Price', 'Discount', 'Total Amount', 'Channel', 'Region'],
    ...data.sales.map((s) => [
      formatDate(s.soldAt),
      s.customer?.name || '',
      s.customer?.company || '',
      s.product?.name || '',
      s.product?.sku || '',
      s.product?.category || '',
      s.quantity,
      formatAmount(s.unitPrice),
      formatAmount(s.discount),
      formatAmount(s.totalAmount),
      s.channel || '',
      s.region || '',
    ]),
    [],
  ]));

  // ── Section 2 — Expenses ────────────────────────────────────
  sections.push(toCsv([
    ['=== EXPENSES ==='],
    ['Date', 'Category', 'Sub-Category', 'Amount', 'Vendor', 'Description'],
    ...data.expenses.map((e) => [
      formatDate(e.occurredAt),
      e.category,
      e.subCategory || '',
      formatAmount(e.amount),
      e.vendor || '',
      e.description || '',
    ]),
    [],
  ]));

  // ── Section 3 — Expense Category Breakdown ──────────────────
  sections.push(toCsv([
    ['=== EXPENSE BREAKDOWN BY CATEGORY ==='],
    ['Category', 'Total Amount', '% of Total Expenses'],
    ...data.expenseByCategory.map((cat) => {
      const pct = data.summary.totalExpenses > 0
        ? ((cat.total / data.summary.totalExpenses) * 100).toFixed(1)
        : '0.0';
      return [cat.category, formatAmount(cat.total), pct + '%'];
    }),
    [],
  ]));

  // ── Section 4 — Inventory Snapshot ─────────────────────────
  sections.push(toCsv([
    ['=== INVENTORY SNAPSHOT ==='],
    ['SKU', 'Product Name', 'Category', 'Qty On Hand', 'Reorder Level', 'Reorder Qty',
     'Warehouse Location', 'Status', 'Selling Price'],
    ...data.inventory.all.map((item) => {
      const status = item.quantity === 0
        ? 'OUT OF STOCK'
        : item.quantity <= item.reorderLevel
          ? 'LOW STOCK'
          : 'OK';
      return [
        item.sku,
        item.name,
        item.product?.category || '',
        item.quantity,
        item.reorderLevel,
        item.reorderQty,
        item.warehouseLocation || '',
        status,
        formatAmount(item.product?.sellingPrice),
      ];
    }),
    [],
  ]));

  // ── Section 5 — Top Customers ───────────────────────────────
  sections.push(toCsv([
    ['=== TOP CUSTOMERS ==='],
    ['Name', 'Company', 'Segment', 'Total Revenue', 'Churn Risk', 'Last Order Date', 'Email'],
    ...data.customers.map((c) => [
      c.name,
      c.company || '',
      c.segment || '',
      formatAmount(c.totalRevenue),
      c.churnRisk ? (c.churnRisk * 100).toFixed(1) + '%' : '',
      formatDate(c.lastOrderAt),
      c.email || '',
    ]),
    [],
  ]));

  // ── Section 6 — AI Insights ─────────────────────────────────
  sections.push(toCsv([
    ['=== AI INSIGHTS ==='],
    ['Severity', 'Type', 'Title', 'Summary', 'Affected Entity', 'Generated At'],
    ...data.aiInsights.map((i) => [
      i.severity,
      i.type,
      i.title,
      i.summary,
      i.affectedEntity || '',
      formatDate(i.generatedAt),
    ]),
  ]));

  const fullCsv = sections.join('\r\n');
  return Buffer.from(fullCsv, 'utf-8');
}
