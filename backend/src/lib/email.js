// src/lib/email.js
// ============================================================
// Email Delivery Helper — Nodemailer via Resend SMTP
// ============================================================

import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: env.RESEND_API_KEY,
      },
    });
  }
  return transporter;
}

function formatCurrency(amount, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : '$';
  return symbol + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ── Report Ready Email ─────────────────────────────────────────

/**
 * Send a "Report Ready" notification email with KPI summary.
 */
export async function sendReportReadyEmail({ recipients, orgName, reportTitle, reportType, summary, currency, exports }) {
  const typeLabel = {
    DAILY_SUMMARY:  'Daily Summary Report',
    WEEKLY_REPORT:  'Weekly Business Report',
    MONTHLY_REPORT: 'Monthly Analytics Report',
    CUSTOM:         'Custom Report',
  }[reportType] || 'Business Report';

  const profitColor = summary.grossProfit >= 0 ? '#10B981' : '#EF4444';

  // Build download buttons HTML for each export
  const buttonColors = { PDF: '#EF4444', CSV: '#10B981', XLSX: '#1D4ED8' };
  const buttonIcons  = { PDF: '📄', CSV: '📊', XLSX: '📑' };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1D4ED8 0%,#1E40AF 100%);padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#BFDBFE;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">DecisionOS</p>
                  <h1 style="margin:4px 0 0;color:#FFFFFF;font-size:20px;font-weight:700;">${typeLabel}</h1>
                </td>
                <td align="right">
                  <span style="background:rgba(255,255,255,0.15);color:#FFFFFF;font-size:11px;padding:6px 12px;border-radius:20px;font-weight:600;">✅ READY</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Org + Report Info -->
        <tr>
          <td style="padding:24px 32px 0;border-bottom:1px solid #E2E8F0;">
            <p style="margin:0 0 4px;font-size:13px;color:#64748B;">Organization</p>
            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0F172A;">${orgName || 'Your Organization'}</p>
            <p style="margin:0 0 16px;font-size:13px;color:#64748B;">${reportTitle}</p>
          </td>
        </tr>

        <!-- KPI Cards -->
        <tr>
          <td style="padding:24px 32px;">
            <h2 style="margin:0 0 16px;font-size:14px;color:#0F172A;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Executive Summary</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="25%" style="padding:0 6px 0 0;">
                  <div style="background:#F0FDF4;border-radius:8px;padding:14px;border-left:3px solid #10B981;">
                    <p style="margin:0;font-size:10px;color:#6B7280;font-weight:600;text-transform:uppercase;">Revenue</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#065F46;">${formatCurrency(summary.totalRevenue, currency)}</p>
                  </div>
                </td>
                <td width="25%" style="padding:0 6px;">
                  <div style="background:#FEF2F2;border-radius:8px;padding:14px;border-left:3px solid #EF4444;">
                    <p style="margin:0;font-size:10px;color:#6B7280;font-weight:600;text-transform:uppercase;">Expenses</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#991B1B;">${formatCurrency(summary.totalExpenses, currency)}</p>
                  </div>
                </td>
                <td width="25%" style="padding:0 6px;">
                  <div style="background:${summary.grossProfit >= 0 ? '#F0FDF4' : '#FEF2F2'};border-radius:8px;padding:14px;border-left:3px solid ${profitColor};">
                    <p style="margin:0;font-size:10px;color:#6B7280;font-weight:600;text-transform:uppercase;">Gross Profit</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${profitColor};">${formatCurrency(summary.grossProfit, currency)}</p>
                  </div>
                </td>
                <td width="25%" style="padding:0 0 0 6px;">
                  <div style="background:#EFF6FF;border-radius:8px;padding:14px;border-left:3px solid #1D4ED8;">
                    <p style="margin:0;font-size:10px;color:#6B7280;font-weight:600;text-transform:uppercase;">Transactions</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1E40AF;">${summary.totalTransactions}</p>
                  </div>
                </td>
              </tr>
            </table>

            ${summary.revenueChange !== null ? `
            <p style="margin:12px 0 0;font-size:12px;color:${summary.revenueChange >= 0 ? '#10B981' : '#EF4444'};">
              ${summary.revenueChange >= 0 ? '▲' : '▼'} ${Math.abs(summary.revenueChange)}% revenue vs previous period
            </p>` : ''}
          </td>
        </tr>

        <!-- Download Section -->
        <tr>
          <td style="padding:0 32px 28px;">
            <h2 style="margin:0 0 16px;font-size:14px;color:#0F172A;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Download Your Report</h2>
            <p style="margin:0 0 16px;font-size:13px;color:#64748B;">Your report is ready. Use the links below to download. Links expire in <strong>1 hour</strong> — log in to DecisionOS for permanent access.</p>
            <p style="margin:0 0 16px;font-size:12px;color:#94A3B8;">Note: Download links require authentication in the app.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;padding:20px 32px;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
              This is an automated message from <strong>DecisionOS</strong>. Report data is confidential — do not forward.<br>
              © ${new Date().getFullYear()} DecisionOS. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `DecisionOS — ${typeLabel}
Organization: ${orgName}
${reportTitle}

Executive Summary:
  Revenue:      ${formatCurrency(summary.totalRevenue, currency)}
  Expenses:     ${formatCurrency(summary.totalExpenses, currency)}
  Gross Profit: ${formatCurrency(summary.grossProfit, currency)}
  Transactions: ${summary.totalTransactions}

Log in to DecisionOS to download your report.

This is an automated message. Do not reply.`;

  await getTransporter().sendMail({
    from: `"DecisionOS Reports" <${env.EMAIL_FROM}>`,
    to: recipients.join(', '),
    subject: `DecisionOS — ${typeLabel} | ${orgName}`,
    html,
    text,
  });
}
