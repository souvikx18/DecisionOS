// src/lib/aiContextBuilder.js
// ============================================================
// Multi-Tenant AI Context Aggregator
// Collects structured business metrics for Gemini and statistical analyzers
// ============================================================

import { prisma } from './prisma.js';

export async function buildOrgAiContext(orgId) {
  const now = new Date();
  
  // Date ranges
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Parallel database queries (Strictly scoped to orgId)
  const [
    org,
    allTimeSalesAgg,
    recentSales,
    salesLast7DaysAgg,
    salesLast30DaysAgg,
    monthlySalesHistory,
    currentMonthExpenses,
    prevMonthExpenses,
    inventoryItems,
    customers,
    products,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, currency: true, industry: true },
    }),
    prisma.sale.aggregate({
      where: { organizationId: orgId },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.sale.findMany({
      where: { organizationId: orgId, soldAt: { gte: thirtyDaysAgo } },
      select: { id: true, productId: true, quantity: true, totalAmount: true, soldAt: true },
    }),
    prisma.sale.aggregate({
      where: { organizationId: orgId, soldAt: { gte: sevenDaysAgo } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.sale.aggregate({
      where: { organizationId: orgId, soldAt: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.sale.findMany({
      where: { organizationId: orgId, soldAt: { gte: sixMonthsAgo } },
      select: { totalAmount: true, soldAt: true },
      orderBy: { soldAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { organizationId: orgId, isArchived: false, occurredAt: { gte: currentMonthStart } },
      select: { category: true, amount: true, vendor: true },
    }),
    prisma.expense.findMany({
      where: { organizationId: orgId, isArchived: false, occurredAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      select: { category: true, amount: true, vendor: true },
    }),
    prisma.inventoryItem.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        reorderLevel: true,
        reorderQty: true,
        warehouseLocation: true,
        productId: true,
      },
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        segment: true,
        totalRevenue: true,
        lastOrderAt: true,
        churnRisk: true,
      },
      orderBy: { totalRevenue: 'desc' },
      take: 20,
    }),
    prisma.product.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: { id: true, name: true, sku: true, category: true, costPrice: true, sellingPrice: true },
    }),
  ]);

  // Aggregate monthly sales buckets for trend & forecasting
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyBuckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIdx = d.getMonth();
    const y = d.getFullYear();
    const monthSales = monthlySalesHistory.filter((s) => {
      const sd = new Date(s.soldAt);
      return sd.getMonth() === mIdx && sd.getFullYear() === y;
    });
    const rev = monthSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
    monthlyBuckets.push({
      monthKey: `${y}-${String(mIdx + 1).padStart(2, '0')}`,
      label: `${monthNames[mIdx]} ${y}`,
      revenue: rev,
      count: monthSales.length,
    });
  }

  // Aggregate current vs previous month expenses by category
  const expenseByCategoryCurrent = {};
  currentMonthExpenses.forEach((e) => {
    expenseByCategoryCurrent[e.category] = (expenseByCategoryCurrent[e.category] || 0) + Number(e.amount);
  });

  const expenseByCategoryPrev = {};
  prevMonthExpenses.forEach((e) => {
    expenseByCategoryPrev[e.category] = (expenseByCategoryPrev[e.category] || 0) + Number(e.amount);
  });

  // Calculate product sales velocity over last 30 days
  const productVelocity = {};
  recentSales.forEach((s) => {
    if (s.productId) {
      productVelocity[s.productId] = (productVelocity[s.productId] || 0) + s.quantity;
    }
  });

  const totalAllTimeRevenue = Number(allTimeSalesAgg._sum.totalAmount || 0);
  const totalSales30d = Number(salesLast30DaysAgg._sum.totalAmount || 0);
  const totalSales7d = Number(salesLast7DaysAgg._sum.totalAmount || 0);

  return {
    organization: org || { id: orgId, name: 'Organization', currency: 'INR' },
    summary: {
      totalAllTimeRevenue,
      totalAllTimeSalesCount: allTimeSalesAgg._count.id || 0,
      salesLast30Days: totalSales30d,
      salesLast7Days: totalSales7d,
      dailySalesRunRate7d: Number((totalSales7d / 7).toFixed(2)),
      dailySalesRunRate30d: Number((totalSales30d / 30).toFixed(2)),
    },
    monthlySalesBuckets: monthlyBuckets,
    expenses: {
      currentMonth: expenseByCategoryCurrent,
      prevMonth: expenseByCategoryPrev,
      currentMonthTotal: Object.values(expenseByCategoryCurrent).reduce((a, b) => a + b, 0),
      prevMonthTotal: Object.values(expenseByCategoryPrev).reduce((a, b) => a + b, 0),
      rawCurrent: currentMonthExpenses,
    },
    inventory: {
      items: inventoryItems,
      totalItems: inventoryItems.length,
      productVelocity,
    },
    customers: {
      topList: customers,
      totalCount: customers.length,
    },
    products: {
      catalog: products,
      totalCount: products.length,
    },
  };
}
