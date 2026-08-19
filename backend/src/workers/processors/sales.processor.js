// src/workers/processors/sales.processor.js
// ============================================================
// Sales Batch Import Processor
// Processes mapped rows, auto-links customers/products, updates revenue
// ============================================================

import { prisma } from '../../lib/prisma.js';

/**
 * Process raw spreadsheet rows for SALES import
 * @param {object} params
 * @param {string} params.organizationId
 * @param {string} params.importId
 * @param {object[]} params.rows
 * @param {Record<string, string>} params.columnMapping
 */
export async function processSalesRows({ organizationId, importId, rows, columnMapping }) {
  let validCount = 0;
  let errorCount = 0;
  const errorDetails = [];

  // Helper to extract mapped value from a row
  const getVal = (row, field) => {
    const rawColName = columnMapping[field];
    if (!rawColName) return undefined;
    return row[rawColName]?.trim();
  };

  // Cache existing customers and products in memory for speed during batch
  const existingCustomers = await prisma.customer.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true },
  });
  const customerMap = new Map();
  existingCustomers.forEach((c) => {
    customerMap.set(c.name.toLowerCase(), c.id);
    if (c.email) customerMap.set(c.email.toLowerCase(), c.id);
  });

  const existingProducts = await prisma.product.findMany({
    where: { organizationId },
    select: { id: true, name: true, sku: true },
  });
  const productMap = new Map();
  existingProducts.forEach((p) => {
    productMap.set(p.name.toLowerCase(), p.id);
    if (p.sku) productMap.set(p.sku.toLowerCase(), p.id);
  });

  const batchSales = [];
  const customerRevenueIncrements = new Map(); // customerId -> totalIncrement

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +1 for 1-indexing, +1 for header row

    try {
      const rawQty = getVal(row, 'quantity');
      const rawPrice = getVal(row, 'unitPrice');
      const rawDiscount = getVal(row, 'discount');
      const rawSoldAt = getVal(row, 'soldAt');
      const rawCustomer = getVal(row, 'customerName');
      const rawProduct = getVal(row, 'productName');
      const rawChannel = getVal(row, 'channel');
      const rawRegion = getVal(row, 'region');
      const rawNotes = getVal(row, 'notes');

      const quantity = parseInt(rawQty, 10);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity: "${rawQty}". Must be a positive integer.`);
      }

      const unitPrice = parseFloat(rawPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid unit price: "${rawPrice}". Must be a positive number.`);
      }

      const discount = rawDiscount ? Math.max(0, parseFloat(rawDiscount) || 0) : 0;
      const totalAmount = Math.max(0, (quantity * unitPrice) - discount);

      let soldAt = new Date();
      if (rawSoldAt) {
        const parsedDate = new Date(rawSoldAt);
        if (!isNaN(parsedDate.getTime())) {
          soldAt = parsedDate;
        }
      }

      // Auto-resolve or create Customer
      let customerId = null;
      if (rawCustomer) {
        const custKey = rawCustomer.toLowerCase();
        if (customerMap.has(custKey)) {
          customerId = customerMap.get(custKey);
        } else {
          // Auto-create customer in org
          const isEmail = rawCustomer.includes('@');
          const newCustomer = await prisma.customer.create({
            data: {
              organizationId,
              name: rawCustomer,
              email: isEmail ? rawCustomer : null,
              region: rawRegion || null,
            },
          });
          customerId = newCustomer.id;
          customerMap.set(custKey, customerId);
        }
      }

      // Auto-resolve or create Product
      let productId = null;
      if (rawProduct) {
        const prodKey = rawProduct.toLowerCase();
        if (productMap.has(prodKey)) {
          productId = productMap.get(prodKey);
        } else {
          // Auto-create product in org
          const newProd = await prisma.product.create({
            data: {
              organizationId,
              name: rawProduct,
              sku: `AUTO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
              costPrice: unitPrice * 0.6, // estimated default cost
              sellingPrice: unitPrice,
            },
          });
          productId = newProd.id;
          productMap.set(prodKey, productId);
        }
      }

      batchSales.push({
        organizationId,
        customerId,
        productId,
        quantity,
        unitPrice,
        discount,
        totalAmount,
        channel: rawChannel || null,
        region: rawRegion || null,
        notes: rawNotes || null,
        soldAt,
        importId,
      });

      if (customerId) {
        const currentInc = customerRevenueIncrements.get(customerId) || 0;
        customerRevenueIncrements.set(customerId, currentInc + totalAmount);
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

  // Insert valid sales in batches of 100 within transactions
  const CHUNK_SIZE = 100;
  for (let i = 0; i < batchSales.length; i += CHUNK_SIZE) {
    const chunk = batchSales.slice(i, i + CHUNK_SIZE);
    await prisma.sale.createMany({ data: chunk });
  }

  // Update customer totalRevenue aggregations
  for (const [custId, revenueInc] of customerRevenueIncrements.entries()) {
    try {
      await prisma.customer.update({
        where: { id: custId },
        data: {
          totalRevenue: { increment: revenueInc },
          lastOrderAt: new Date(),
        },
      });
    } catch { /* ignore if customer missing */ }
  }

  return { validCount, errorCount, errorDetails };
}
