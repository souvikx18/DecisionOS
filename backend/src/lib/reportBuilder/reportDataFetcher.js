// src/lib/reportBuilder/reportDataFetcher.js
// ============================================================
// Report Data Aggregator — Multi-Tenant Context Fetcher
// Reused by all 3 report types: Daily, Weekly, Monthly
// Every query strictly scoped by organizationId
// ============================================================

import { prisma } from '../prisma.js';

/**
 * Fetch all data required to generate a report for a given time period.
 * @param {string} orgId
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @returns {Promise<ReportData>}
 */
export async function fetchReportData(orgId, periodStart, periodEnd) {
  const [
    org,
    salesAgg,
    salesList,
    expensesAgg,
    expensesList,
    inventoryItems,
    customers,
    topProducts,
    aiInsights,
    prevPeriodSales,
  ] = await Promise.all([
    // Organization info
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, currency: true, industry: true },
    }),

    // Period sales aggregate
    prisma.sale.aggregate({
      where: { organizationId: orgId, soldAt: { gte: periodStart, lte: periodEnd } },
      _sum: { totalAmount: true, quantity: true },
      _count: { id: true },
    }),

    // Period sales detail (for tables/CSV)
    prisma.sale.findMany({
      where: { organizationId: orgId, soldAt: { gte: periodStart, lte: periodEnd } },
      select: {
        id: true, totalAmount: true, quantity: true, unitPrice: true,
        discount: true, channel: true, region: true, soldAt: true,
        customer: { select: { name: true, company: true } },
        product: { select: { name: true, sku: true, category: true } },
      },
      orderBy: { soldAt: 'desc' },
    }),

    // Period expense aggregate
    prisma.expense.aggregate({
      where: { organizationId: orgId, isArchived: false, occurredAt: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Period expenses detail (for tables/CSV)
    prisma.expense.findMany({
      where: { organizationId: orgId, isArchived: false, occurredAt: { gte: periodStart, lte: periodEnd } },
      select: {
        id: true, category: true, subCategory: true, amount: true,
        vendor: true, description: true, occurredAt: true,
      },
      orderBy: { occurredAt: 'desc' },
    }),

    // Full inventory snapshot
    prisma.inventoryItem.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: {
        id: true, name: true, sku: true, quantity: true,
        reorderLevel: true, reorderQty: true, warehouseLocation: true,
        product: { select: { name: true, sellingPrice: true, category: true } },
      },
      orderBy: { quantity: 'asc' }, // most critical first
    }),

    // Top customers by revenue
    prisma.customer.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: {
        id: true, name: true, company: true, segment: true,
        totalRevenue: true, lastOrderAt: true, churnRisk: true, email: true,
      },
      orderBy: { totalRevenue: 'desc' },
      take: 10,
    }),

    // Top products by sales in period
    prisma.sale.groupBy({
      by: ['productId'],
      where: { organizationId: orgId, soldAt: { gte: periodStart, lte: periodEnd } },
      _sum: { totalAmount: true, quantity: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    }),

    // Active AI insights (not dismissed) generated during period or still active
    prisma.aiInsight.findMany({
      where: {
        organizationId: orgId,
        isDismissed: false,
        generatedAt: { gte: periodStart },
      },
      select: {
        id: true, type: true, severity: true, title: true, summary: true,
        affectedEntity: true, confidence: true, generatedAt: true,
      },
      orderBy: [{ severity: 'asc' }, { generatedAt: 'desc' }],
    }),

    // Previous period sales for MoM/WoW comparison
    prisma.sale.aggregate({
      where: {
        organizationId: orgId,
        soldAt: {
          gte: new Date(periodStart.getTime() - (periodEnd.getTime() - periodStart.getTime())),
          lt: periodStart,
        },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
  ]);

  // Resolve product names for topProducts groupBy result
  const productIds = topProducts.map((p) => p.productId);
  const productDetails = await prisma.product.findMany({
    where: { id: { in: productIds }, organizationId: orgId },
    select: { id: true, name: true, sku: true, category: true, sellingPrice: true },
  });
  const productMap = Object.fromEntries(productDetails.map((p) => [p.id, p]));

  // Expense category breakdown
  const expenseCategoryMap = {};
  for (const exp of expensesList) {
    expenseCategoryMap[exp.category] = (expenseCategoryMap[exp.category] || 0) + exp.amount;
  }
  const expenseByCategory = Object.entries(expenseCategoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Inventory alerts
  const inventoryAlerts = inventoryItems.filter((i) => i.quantity <= i.reorderLevel);
  const criticalStock = inventoryItems.filter((i) => i.quantity === 0);

  // Period revenue vs prev period
  const currentRevenue = salesAgg._sum.totalAmount || 0;
  const prevRevenue = prevPeriodSales._sum.totalAmount || 0;
  const revenueChange = prevRevenue > 0
    ? (((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
    : null;

  // Net P&L
  const totalExpenses = expensesAgg._sum.amount || 0;
  const grossProfit = currentRevenue - totalExpenses;
  const profitMargin = currentRevenue > 0
    ? ((grossProfit / currentRevenue) * 100).toFixed(1)
    : 0;

  return {
    org,
    period: { start: periodStart, end: periodEnd },
    summary: {
      totalRevenue: currentRevenue,
      totalTransactions: salesAgg._count.id,
      totalExpenses,
      grossProfit,
      profitMargin: parseFloat(profitMargin),
      prevRevenue,
      revenueChange: revenueChange ? parseFloat(revenueChange) : null,
    },
    sales: salesList,
    expenses: expensesList,
    expenseByCategory,
    inventory: {
      all: inventoryItems,
      alerts: inventoryAlerts,
      critical: criticalStock,
    },
    customers,
    topProducts: topProducts.map((p) => ({
      ...p,
      product: productMap[p.productId] || null,
    })),
    aiInsights,
  };
}
