// src/workers/processors/expenses.processor.js
// ============================================================
// Expenses Batch Import Processor
// ============================================================

import { prisma } from '../../lib/prisma.js';

/**
 * Process raw spreadsheet rows for EXPENSES import
 */
export async function processExpensesRows({ organizationId, importId, rows, columnMapping }) {
  let validCount = 0;
  let errorCount = 0;
  const errorDetails = [];

  const getVal = (row, field) => {
    const rawColName = columnMapping[field];
    if (!rawColName) return undefined;
    return row[rawColName]?.trim();
  };

  const batchExpenses = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const rawCategory = getVal(row, 'category');
      const rawAmount = getVal(row, 'amount');
      const rawSubCategory = getVal(row, 'subCategory');
      const rawVendor = getVal(row, 'vendor');
      const rawDesc = getVal(row, 'description');
      const rawDate = getVal(row, 'occurredAt');

      if (!rawCategory) {
        throw new Error('Expense category is required.');
      }

      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid expense amount: "${rawAmount}". Must be greater than 0.`);
      }

      let occurredAt = new Date();
      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          occurredAt = parsedDate;
        }
      }

      batchExpenses.push({
        organizationId,
        category: rawCategory,
        subCategory: rawSubCategory || null,
        amount,
        vendor: rawVendor || null,
        description: rawDesc || null,
        occurredAt,
        importId,
      });

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

  const CHUNK_SIZE = 100;
  for (let i = 0; i < batchExpenses.length; i += CHUNK_SIZE) {
    const chunk = batchExpenses.slice(i, i + CHUNK_SIZE);
    await prisma.expense.createMany({ data: chunk });
  }

  return { validCount, errorCount, errorDetails };
}
