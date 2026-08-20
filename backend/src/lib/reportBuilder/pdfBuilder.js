// src/lib/reportBuilder/pdfBuilder.js
// ============================================================
// PDF Report Builder — Powered by PDFKit
// Generates branded Daily, Weekly, Monthly reports
// ============================================================

import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

// ── Brand Colors ────────────────────────────────────────────
const COLORS = {
  primary:    '#1D4ED8',
  dark:       '#0F172A',
  slate:      '#475569',
  border:     '#E2E8F0',
  success:    '#10B981',
  warning:    '#F59E0B',
  danger:     '#EF4444',
  white:      '#FFFFFF',
  lightBg:    '#F8FAFC',
};

function formatCurrency(amount, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : '$';
  return symbol + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPct(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

/**
 * Build a PDF report buffer for the given data & type.
 * @param {object} data - output from reportDataFetcher.fetchReportData()
 * @param {string} reportType - DAILY_SUMMARY | WEEKLY_REPORT | MONTHLY_REPORT
 * @returns {Promise<Buffer>}
 */
export async function buildPdf(data, reportType) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const buffers = [];
    const stream = new PassThrough();

    stream.on('data', (chunk) => buffers.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', reject);
    doc.pipe(stream);

    const pageWidth = doc.page.width - 100; // accounting for margins

    // ── Header ───────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);
    doc.fillColor(COLORS.white).fontSize(22).font('Helvetica-Bold')
      .text('DecisionOS', 50, 22);
    doc.fontSize(10).font('Helvetica')
      .text('AI-Powered Business Intelligence', 50, 50);

    // Report title (right-aligned in header)
    const titleMap = {
      DAILY_SUMMARY: 'Daily Summary Report',
      WEEKLY_REPORT: 'Weekly Business Report',
      MONTHLY_REPORT: 'Monthly Analytics Report',
      CUSTOM: 'Custom Report',
    };
    const reportTitle = titleMap[reportType] || 'Business Report';
    doc.fillColor(COLORS.white).fontSize(11).font('Helvetica-Bold')
      .text(reportTitle, 50, 30, { align: 'right', width: pageWidth });
    doc.fontSize(9).font('Helvetica')
      .text(`${formatDate(data.period.start)} – ${formatDate(data.period.end)}`, 50, 50, { align: 'right', width: pageWidth });

    doc.moveDown(4);

    // ── Organization Info ─────────────────────────────────────
    doc.fillColor(COLORS.dark).fontSize(14).font('Helvetica-Bold')
      .text(data.org.name, 50, 100);
    doc.fillColor(COLORS.slate).fontSize(9).font('Helvetica')
      .text(`Industry: ${data.org.industry || '—'}  |  Currency: ${data.org.currency}  |  Generated: ${formatDate(new Date())}`, 50, 118);

    doc.moveTo(50, 135).lineTo(50 + pageWidth, 135).strokeColor(COLORS.border).lineWidth(1).stroke();
    doc.moveDown(1);

    let y = 150;

    // ── KPI Summary Cards ─────────────────────────────────────
    doc.fillColor(COLORS.dark).fontSize(12).font('Helvetica-Bold').text('Executive Summary', 50, y);
    y += 20;

    const kpis = [
      { label: 'Total Revenue', value: formatCurrency(data.summary.totalRevenue, data.org.currency), color: COLORS.success },
      { label: 'Total Expenses', value: formatCurrency(data.summary.totalExpenses, data.org.currency), color: COLORS.danger },
      { label: 'Gross Profit', value: formatCurrency(data.summary.grossProfit, data.org.currency), color: data.summary.grossProfit >= 0 ? COLORS.success : COLORS.danger },
      { label: 'Profit Margin', value: data.summary.profitMargin + '%', color: COLORS.primary },
    ];

    const cardW = (pageWidth - 30) / 4;
    kpis.forEach((kpi, i) => {
      const x = 50 + i * (cardW + 10);
      doc.rect(x, y, cardW, 60).fill(COLORS.lightBg).stroke(COLORS.border);
      doc.fillColor(COLORS.slate).fontSize(8).font('Helvetica').text(kpi.label, x + 8, y + 8, { width: cardW - 16 });
      doc.fillColor(kpi.color).fontSize(14).font('Helvetica-Bold').text(kpi.value, x + 8, y + 26, { width: cardW - 16 });
    });
    y += 80;

    // Revenue change vs previous period
    if (data.summary.revenueChange !== null) {
      const arrow = data.summary.revenueChange >= 0 ? '▲' : '▼';
      const col = data.summary.revenueChange >= 0 ? COLORS.success : COLORS.danger;
      doc.fillColor(col).fontSize(9).font('Helvetica')
        .text(`${arrow} ${Math.abs(data.summary.revenueChange)}% vs previous period`, 50, y);
      y += 18;
    }

    doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor(COLORS.border).stroke();
    y += 15;

    // ── Sales Section ─────────────────────────────────────────
    doc.fillColor(COLORS.dark).fontSize(12).font('Helvetica-Bold').text('Sales Performance', 50, y);
    y += 20;

    doc.fillColor(COLORS.slate).fontSize(9).font('Helvetica')
      .text(`${data.summary.totalTransactions} transactions recorded in this period.`, 50, y);
    y += 15;

    // Top 5 Sales Rows
    if (data.sales.length > 0) {
      const headers = ['Date', 'Customer', 'Product', 'Qty', 'Amount'];
      const colW = [70, 130, 130, 40, 80];
      let x = 50;

      doc.rect(50, y, pageWidth, 16).fill(COLORS.primary);
      headers.forEach((h, i) => {
        doc.fillColor(COLORS.white).fontSize(8).font('Helvetica-Bold').text(h, x + 4, y + 4, { width: colW[i] - 8 });
        x += colW[i];
      });
      y += 16;

      const rows = data.sales.slice(0, 10);
      rows.forEach((sale, idx) => {
        if (y > 720) { doc.addPage(); y = 50; }
        const bg = idx % 2 === 0 ? COLORS.white : COLORS.lightBg;
        doc.rect(50, y, pageWidth, 15).fill(bg);
        x = 50;
        const cells = [
          formatDate(sale.soldAt),
          sale.customer?.name || '—',
          sale.product?.name || '—',
          String(sale.quantity),
          formatCurrency(sale.totalAmount, data.org.currency),
        ];
        cells.forEach((cell, i) => {
          doc.fillColor(COLORS.dark).fontSize(7.5).font('Helvetica')
            .text(cell, x + 4, y + 4, { width: colW[i] - 8, ellipsis: true });
          x += colW[i];
        });
        y += 15;
      });

      if (data.sales.length > 10) {
        doc.fillColor(COLORS.slate).fontSize(8).font('Helvetica')
          .text(`+ ${data.sales.length - 10} more transactions (see CSV export for full data)`, 50, y + 4);
        y += 18;
      }
      y += 10;
    }

    // ── Expense Breakdown Section ─────────────────────────────
    if (y > 680) { doc.addPage(); y = 50; }
    doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor(COLORS.border).stroke();
    y += 15;
    doc.fillColor(COLORS.dark).fontSize(12).font('Helvetica-Bold').text('Expense Breakdown by Category', 50, y);
    y += 20;

    if (data.expenseByCategory.length > 0) {
      data.expenseByCategory.slice(0, 8).forEach((cat, i) => {
        if (y > 720) { doc.addPage(); y = 50; }
        const barMaxW = pageWidth - 140;
        const barW = data.summary.totalExpenses > 0
          ? Math.max(4, (cat.total / data.summary.totalExpenses) * barMaxW)
          : 4;
        const pct = data.summary.totalExpenses > 0
          ? ((cat.total / data.summary.totalExpenses) * 100).toFixed(1)
          : 0;

        doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica').text(cat.category, 50, y, { width: 120 });
        doc.rect(180, y + 1, barW, 10).fill(COLORS.primary);
        doc.fillColor(COLORS.slate).fontSize(8).font('Helvetica')
          .text(`${formatCurrency(cat.total, data.org.currency)} (${pct}%)`, 185 + barMaxW, y, { width: 100 });
        y += 20;
      });
    } else {
      doc.fillColor(COLORS.slate).fontSize(9).text('No expenses recorded in this period.', 50, y);
      y += 20;
    }

    // ── Inventory Alerts Section ──────────────────────────────
    if (data.inventory.alerts.length > 0) {
      if (y > 650) { doc.addPage(); y = 50; }
      y += 5;
      doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor(COLORS.border).stroke();
      y += 15;
      doc.fillColor(COLORS.dark).fontSize(12).font('Helvetica-Bold').text('Inventory Alerts', 50, y);
      y += 20;

      const invHeaders = ['SKU', 'Product', 'Stock', 'Reorder At', 'Status'];
      const invColW = [80, 180, 60, 80, 80];
      let x2 = 50;
      doc.rect(50, y, pageWidth, 16).fill(COLORS.warning);
      invHeaders.forEach((h, i) => {
        doc.fillColor(COLORS.white).fontSize(8).font('Helvetica-Bold').text(h, x2 + 4, y + 4, { width: invColW[i] - 8 });
        x2 += invColW[i];
      });
      y += 16;

      data.inventory.alerts.slice(0, 8).forEach((item, idx) => {
        if (y > 720) { doc.addPage(); y = 50; }
        const bg = idx % 2 === 0 ? COLORS.white : '#FFFBEB';
        doc.rect(50, y, pageWidth, 15).fill(bg);
        x2 = 50;
        const status = item.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
        const statusColor = item.quantity === 0 ? COLORS.danger : COLORS.warning;
        const cells2 = [item.sku, item.name, String(item.quantity), String(item.reorderLevel)];
        cells2.forEach((cell, i) => {
          doc.fillColor(COLORS.dark).fontSize(7.5).font('Helvetica')
            .text(cell, x2 + 4, y + 4, { width: invColW[i] - 8, ellipsis: true });
          x2 += invColW[i];
        });
        doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold')
          .text(status, x2 + 4, y + 4, { width: invColW[4] - 8 });
        y += 15;
      });
      y += 10;
    }

    // ── AI Insights Section ───────────────────────────────────
    if (data.aiInsights.length > 0) {
      if (y > 640) { doc.addPage(); y = 50; }
      y += 5;
      doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor(COLORS.border).stroke();
      y += 15;
      doc.fillColor(COLORS.dark).fontSize(12).font('Helvetica-Bold').text('AI Insights', 50, y);
      y += 20;

      const sevColor = { CRITICAL: COLORS.danger, WARNING: COLORS.warning, INFO: COLORS.primary, GOOD: COLORS.success };
      data.aiInsights.slice(0, 5).forEach((insight) => {
        if (y > 710) { doc.addPage(); y = 50; }
        const color = sevColor[insight.severity] || COLORS.slate;
        doc.rect(50, y, 6, 30).fill(color);
        doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica-Bold')
          .text(insight.title, 64, y + 2, { width: pageWidth - 14 });
        doc.fillColor(COLORS.slate).fontSize(8).font('Helvetica')
          .text(insight.summary, 64, y + 14, { width: pageWidth - 14, ellipsis: true });
        y += 38;
      });
    }

    // ── Footer (all pages) ────────────────────────────────────
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 35, doc.page.width, 35).fill(COLORS.lightBg);
      doc.fillColor(COLORS.slate).fontSize(7.5).font('Helvetica')
        .text(
          `DecisionOS — Confidential Business Report | ${data.org.name} | Generated ${formatDate(new Date())} | Page ${i + 1} of ${pageCount}`,
          50, doc.page.height - 22, { width: pageWidth, align: 'center' }
        );
    }

    doc.end();
  });
}
