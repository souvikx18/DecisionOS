// src/modules/expenses/expenses.service.js
// ============================================================
// Expenses Business Logic (Multi-Tenant Scoped)
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { parsePagination, formatPaginationMeta } from '../../lib/pagination.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';

// Shared expense select
const EXPENSE_SELECT = {
  id: true,
  category: true,
  subCategory: true,
  amount: true,
  description: true,
  vendor: true,
  receiptUrl: true,
  occurredAt: true,
  isArchived: true,
  createdAt: true,
};

// ── LIST EXPENSES ──────────────────────────────────────────────
export async function listExpensesService(orgId, query) {
  const { page, limit, skip, take, orderBy, search } = parsePagination(query, {
    defaultSortBy: 'occurredAt',
    defaultSortOrder: 'desc',
  });

  const where = {
    organizationId: orgId,
    ...(query.isArchived !== undefined
      ? { isArchived: query.isArchived === 'true' }
      : { isArchived: false }),
    ...(query.category && { category: { equals: query.category, mode: 'insensitive' } }),
    ...(query.vendor && { vendor: { contains: query.vendor, mode: 'insensitive' } }),
    ...(query.startDate || query.endDate ? {
      occurredAt: {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate) }),
      },
    } : {}),
    ...(search && {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [expenses, total, aggregate] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take,
      orderBy,
      select: EXPENSE_SELECT,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    expenses,
    summary: {
      totalExpenses: aggregate._sum.amount || 0,
    },
    meta: formatPaginationMeta(total, page, limit),
  };
}

// ── GET SINGLE EXPENSE ─────────────────────────────────────────
export async function getExpenseService(orgId, expenseId) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId: orgId },
    select: EXPENSE_SELECT,
  });

  if (!expense) return { notFound: true };
  return { expense };
}

// ── CREATE EXPENSE ─────────────────────────────────────────────
export async function createExpenseService(req, orgId, data) {
  const expense = await prisma.expense.create({
    data: {
      ...data,
      organizationId: orgId,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    },
    select: EXPENSE_SELECT,
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'Expense',
    entityId: expense.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'EXPENSE_RECORDED', amount: data.amount, category: data.category },
  });

  return { expense };
}

// ── UPDATE EXPENSE ─────────────────────────────────────────────
export async function updateExpenseService(req, orgId, expenseId, updates) {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) return { notFound: true };

  const data = {
    ...updates,
    ...(updates.occurredAt && { occurredAt: new Date(updates.occurredAt) }),
  };

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data,
    select: EXPENSE_SELECT,
  });

  return { expense };
}

// ── ARCHIVE EXPENSE ────────────────────────────────────────────
export async function archiveExpenseService(req, orgId, expenseId) {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId: orgId },
    select: { id: true, isArchived: true },
  });

  if (!existing) return { notFound: true };

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: { isArchived: !existing.isArchived },
    select: { id: true, isArchived: true },
  });

  return { expense };
}

// ── EXPENSE BREAKDOWN & CATEGORIES ─────────────────────────────
export async function getExpenseBreakdownService(orgId, query) {
  const where = {
    organizationId: orgId,
    isArchived: false,
    ...(query.startDate || query.endDate ? {
      occurredAt: {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate) }),
      },
    } : {}),
  };

  const [categoryAgg, totalAgg] = await Promise.all([
    prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const total = Number(totalAgg._sum.amount || 0);

  const categories = categoryAgg.map((c) => {
    const sum = Number(c._sum.amount || 0);
    const percentage = total > 0 ? ((sum / total) * 100).toFixed(1) : 0;
    return {
      category: c.category,
      amount: sum,
      count: c._count.id,
      percentage: Number(percentage),
    };
  }).sort((a, b) => b.amount - a.amount);

  return {
    totalExpenses: total,
    breakdown: categories,
  };
}
