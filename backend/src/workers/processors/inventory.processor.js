// src/workers/processors/inventory.processor.js
// ============================================================
// Inventory Batch Import Processor
// ============================================================

import { prisma } from '../../lib/prisma.js';

/**
 * Process raw spreadsheet rows for INVENTORY import
 */
export async function processInventoryRows({ organizationId, rows, columnMapping }) {
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
      const rawQty = getVal(row, 'quantity');
      const rawReorder = getVal(row, 'reorderLevel');
      const rawBatch = getVal(row, 'reorderQty');
      const rawLocation = getVal(row, 'warehouseLocation');

      if (!rawName) {
        throw new Error('Item name is required.');
      }

      const quantity = parseInt(rawQty, 10);
      if (isNaN(quantity) || quantity < 0) {
        throw new Error(`Invalid stock quantity: "${rawQty}". Must be 0 or greater.`);
      }

      const reorderLevel = rawReorder ? Math.max(0, parseInt(rawReorder, 10) || 0) : 0;
      const reorderQty = rawBatch ? Math.max(0, parseInt(rawBatch, 10) || 0) : 0;

      // Upsert by SKU or Name in this organization
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          organizationId,
          ...(rawSku ? { sku: rawSku } : { name: rawName }),
        },
      });

      if (existing) {
        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            quantity,
            reorderLevel,
            reorderQty,
            warehouseLocation: rawLocation || existing.warehouseLocation,
            lastRestockedAt: new Date(),
          },
        });
      } else {
        await prisma.inventoryItem.create({
          data: {
            organizationId,
            name: rawName,
            sku: rawSku || null,
            quantity,
            reorderLevel,
            reorderQty,
            warehouseLocation: rawLocation || null,
            lastRestockedAt: new Date(),
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
