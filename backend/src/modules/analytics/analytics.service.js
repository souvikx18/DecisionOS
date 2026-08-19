// src/modules/analytics/analytics.service.js
// ============================================================
// Executive Analytics & KPI Aggregations (Multi-Tenant Scoped)
// Powers Executive Dashboard Cards and Charts
// ============================================================

import { prisma } from '../../lib/prisma.js';

// ── 1. UNIFIED EXECUTIVE KPI SUMMARY ───────────────────────────
export async function getExecutiveSummaryService(orgId) {
  const now = new Date();
  
  // Current month bounds
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Previous month bounds
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [
    totalSalesAgg,
    prevSalesAgg,
    totalExpensesAgg,
    prevExpensesAgg,
    activeCustomersCount,
    inventoryAlerts,
  ] = await Promise.all([
    // All-time & current month sales
    prisma.sale.aggregate({
      where: { organizationId: orgId },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    // Previous month sales (for growth %)
    prisma.sale.aggregate({
      where: {
        organizationId: orgId,
        soldAt: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    // All-time expenses
    prisma.expense.aggregate({
      where: { organizationId: orgId, isArchived: false },
      _sum: { amount: true },
    }),
    // Previous month expenses
    prisma.expense.aggregate({
      where: {
        organizationId: orgId,
        isArchived: false,
        occurredAt: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    }),
    // Customer count
    prisma.customer.count({
      where: { organizationId: orgId, isArchived: false },
    }),
    // Low stock items
    prisma.inventoryItem.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: { quantity: true, reorderLevel: true },
    }),
  ]);

  const totalRevenue = Number(totalSalesAgg._sum.totalAmount || 0);
  const totalSalesCount = totalSalesAgg._count.id || 0;
  const totalExpenses = Number(totalExpensesAgg._sum.amount || 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMarginPercent = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const lowStockCount = inventoryAlerts.filter((i) => i.quantity <= i.reorderLevel).length;

  // Calculate percentage growth for metrics
  const prevRevenue = Number(prevSalesAgg._sum.totalAmount || 0);
  const revenueGrowth = prevRevenue > 0
    ? Number((((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
    : 0;

  const prevExpenses = Number(prevExpensesAgg._sum.amount || 0);
  const expenseGrowth = prevExpenses > 0
    ? Number((((totalExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1))
    : 0;

  return {
    kpis: {
      totalRevenue: {
        value: totalRevenue,
        formatted: `₹${totalRevenue.toLocaleString('en-IN')}`,
        growthPercent: revenueGrowth,
        growthType: revenueGrowth >= 0 ? 'positive' : 'negative',
      },
      totalSales: {
        count: totalSalesCount,
        formatted: totalSalesCount.toLocaleString('en-IN'),
        prevPeriodCount: prevSalesAgg._count.id || 0,
      },
      totalExpenses: {
        value: totalExpenses,
        formatted: `₹${totalExpenses.toLocaleString('en-IN')}`,
        growthPercent: expenseGrowth,
        growthType: expenseGrowth <= 0 ? 'positive' : 'negative', // lower expenses = positive
      },
      netProfit: {
        value: netProfit,
        formatted: `₹${netProfit.toLocaleString('en-IN')}`,
        marginPercent: profitMarginPercent,
      },
      customers: {
        activeCount: activeCustomersCount,
      },
      inventory: {
        lowStockAlerts: lowStockCount,
      },
    },
  };
}

// ── 2. REVENUE TREND (Last 6–12 Months Chart Data) ─────────────
export async function getRevenueTrendChartService(orgId, monthsBack = 6) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const sales = await prisma.sale.findMany({
    where: {
      organizationId: orgId,
      soldAt: { gte: startDate },
    },
    select: {
      totalAmount: true,
      soldAt: true,
    },
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIndex = d.getMonth();
    const y = d.getFullYear();
    const mName = monthNames[mIndex];

    const monthSales = sales.filter((s) => {
      const sDate = new Date(s.soldAt);
      return sDate.getMonth() === mIndex && sDate.getFullYear() === y;
    });

    const revenue = monthSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);

    monthlyData.push({
      month: `${mName} ${y === now.getFullYear() ? '' : `'${String(y).slice(-2)}`}`.trim(),
      revenue,
      salesCount: monthSales.length,
    });
  }

  return { trend: monthlyData };
}

// ── 3. EXPENSE BREAKDOWN (Category Donut/Bar Chart Data) ────────
export async function getExpenseBreakdownChartService(orgId) {
  const expenses = await prisma.expense.groupBy({
    by: ['category'],
    where: { organizationId: orgId, isArchived: false },
    _sum: { amount: true },
    _count: { id: true },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

  const breakdown = expenses.map((e) => {
    const amount = Number(e._sum.amount || 0);
    const percentage = total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0;
    return {
      category: e.category,
      amount,
      count: e._count.id,
      percentage,
    };
  }).sort((a, b) => b.amount - a.amount);

  return {
    totalExpenses: total,
    categories: breakdown,
  };
}
