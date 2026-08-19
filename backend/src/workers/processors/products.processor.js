// src/workers/processors/products.processor.js
// ============================================================
// Products Batch Import Processor
// ============================================================

import { prisma } from '../../lib/prisma.js';

/**
 * Process raw spreadsheet rows for PRODUCTS import
 */
export async function processProductsRows({ organizationId, rows, columnMapping }) {
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
      const rawSku = getVal(row, 'sku');
      const rawCategory = getVal(row, 'category');
      const rawUnit = getVal(row, 'unit');
      const rawCost = getVal(row, 'costPrice');
      const rawSelling = getVal(row, 'sellingPrice');

      if (!rawName) {
        throw new Error('Product name is required.');
      }

      const costPrice = parseFloat(rawCost);
      if (isNaN(costPrice) || costPrice < 0) {
        throw new Error(`Invalid cost price: "${rawCost}". Must be 0 or greater.`);
      }

      const sellingPrice = parseFloat(rawSelling);
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        throw new Error(`Invalid selling price: "${rawSelling}". Must be 0 or greater.`);
      }

      const sku = rawSku || `SKU-${Date.now().toString().slice(-6)}-${i + 1}`;

      // Check if product exists by SKU or Name in this org
      const existing = await prisma.product.findFirst({
        where: {
          organizationId,
          OR: [
            { sku },
            { name: { equals: rawName, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            category: rawCategory || existing.category,
            unit: rawUnit || existing.unit,
            costPrice,
            sellingPrice,
          },
        });
      } else {
        await prisma.product.create({
          data: {
            organizationId,
            name: rawName,
            sku,
            category: rawCategory || null,
            unit: rawUnit || 'pcs',
            costPrice,
            sellingPrice,
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
