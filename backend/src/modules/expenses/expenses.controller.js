// src/modules/expenses/expenses.controller.js
// ============================================================
// Expenses Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
} from './expenses.schema.js';
import {
  listExpensesService,
  getExpenseService,
  createExpenseService,
  updateExpenseService,
  archiveExpenseService,
  getExpenseBreakdownService,
} from './expenses.service.js';

// ── GET /api/v1/expenses ───────────────────────────────────────
export async function listExpenses(req, res) {
  const parsed = listExpensesQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await listExpensesService(req.org.id, parsed.data);
  return sendSuccess(res, { expenses: result.expenses, summary: result.summary }, 200, null, result.meta);
}

// ── GET /api/v1/expenses/summary/breakdown ─────────────────────
export async function getExpenseBreakdown(req, res) {
  const result = await getExpenseBreakdownService(req.org.id, req.query);
  return sendSuccess(res, result);
}

// ── GET /api/v1/expenses/:id ───────────────────────────────────
export async function getExpense(req, res) {
  const result = await getExpenseService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'EXPENSE_NOT_FOUND', 'Expense record not found.');
  return sendSuccess(res, result.expense);
}

// ── POST /api/v1/expenses ──────────────────────────────────────
export async function createExpense(req, res) {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await createExpenseService(req, req.org.id, parsed.data);
  return sendSuccess(res, result.expense, 201, 'Expense recorded successfully.');
}

// ── PATCH /api/v1/expenses/:id ─────────────────────────────────
export async function updateExpense(req, res) {
  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await updateExpenseService(req, req.org.id, req.params.id, parsed.data);
  if (result.notFound) return sendError(res, 404, 'EXPENSE_NOT_FOUND', 'Expense record not found.');

  return sendSuccess(res, result.expense, 200, 'Expense updated successfully.');
}

// ── DELETE /api/v1/expenses/:id ────────────────────────────────
export async function archiveExpense(req, res) {
  const result = await archiveExpenseService(req, req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'EXPENSE_NOT_FOUND', 'Expense record not found.');

  const action = result.expense.isArchived ? 'archived' : 'unarchived';
  return sendSuccess(res, result.expense, 200, `Expense ${action} successfully.`);
}
