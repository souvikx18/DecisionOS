// src/workers/processors/customers.processor.js
// ============================================================
// Customers Batch Import Processor
// ============================================================

import { prisma } from '../../lib/prisma.js';

/**
 * Process raw spreadsheet rows for CUSTOMERS import
 */
export async function processCustomersRows({ organizationId, rows, columnMapping }) {
  let validCount = 0;
  let errorCount = 0;
  const errorDetails = [];

  const getVal = (row, field) => {
    const rawColName = columnMapping[field];
    if (!rawColName) return undefined;
    return row[rawColName]?.trim();
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const rawName = getVal(row, 'name');
      const rawEmail = getVal(row, 'email');
      const rawPhone = getVal(row, 'phone');
      const rawCompany = getVal(row, 'company');
      const rawRegion = getVal(row, 'region');
      const rawSegment = getVal(row, 'segment');

      if (!rawName) {
        throw new Error('Customer name is required.');
      }

      // Check if customer exists by email or name in this org
      const existing = await prisma.customer.findFirst({
        where: {
          organizationId,
          OR: [
            ...(rawEmail ? [{ email: rawEmail.toLowerCase() }] : []),
            { name: { equals: rawName, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: {
            email: rawEmail?.toLowerCase() || existing.email,
            phone: rawPhone || existing.phone,
            company: rawCompany || existing.company,
            region: rawRegion || existing.region,
            segment: rawSegment || existing.segment,
          },
        });
      } else {
        await prisma.customer.create({
          data: {
            organizationId,
            name: rawName,
            email: rawEmail?.toLowerCase() || null,
            phone: rawPhone || null,
            company: rawCompany || null,
            region: rawRegion || null,
            segment: rawSegment || null,
          },
        });
      }

      validCount++;
    } catch (err) {
      errorCount++;
      errorDetails.push({
        row: rowNum,
        error: err.message,
        data: row,
      });
    }
  }

  return { validCount, errorCount, errorDetails };
}
