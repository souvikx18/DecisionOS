// src/modules/sales/sales.service.js
// ============================================================
// Sales Business Logic (Multi-Tenant & Atomic Transactions)
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { parsePagination, formatPaginationMeta } from '../../lib/pagination.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';

// Shared sale select
const SALE_SELECT = {
  id: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  discount: true,
  channel: true,
  region: true,
  soldAt: true,
  notes: true,
  createdAt: true,
  customer: {
    select: { id: true, name: true, email: true, company: true },
  },
  product: {
    select: { id: true, name: true, sku: true, category: true },
  },
};

// ── LIST SALES ─────────────────────────────────────────────────
export async function listSalesService(orgId, query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query, {
    defaultSortBy: 'soldAt',
    defaultSortOrder: 'desc',
  });

  const where = {
    organizationId: orgId,
    ...(query.customerId && { customerId: query.customerId }),
    ...(query.productId && { productId: query.productId }),
    ...(query.channel && { channel: { equals: query.channel, mode: 'insensitive' } }),
    ...(query.region && { region: { equals: query.region, mode: 'insensitive' } }),
    ...(query.startDate || query.endDate ? {
      soldAt: {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate) }),
      },
    } : {}),
  };

  const [sales, total, aggregate] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take,
      orderBy,
      select: SALE_SELECT,
    }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true, quantity: true },
    }),
  ]);

  return {
    sales,
    summary: {
      totalRevenue: aggregate._sum.totalAmount || 0,
      totalUnitsSold: aggregate._sum.quantity || 0,
    },
    meta: formatPaginationMeta(total, page, limit),
  };
}

// ── GET SINGLE SALE ────────────────────────────────────────────
export async function getSaleService(orgId, saleId) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId: orgId },
    select: SALE_SELECT,
  });

  if (!sale) return { notFound: true };
  return { sale };
}

// ── RECORD SALE (Atomic Transaction) ───────────────────────────
export async function createSaleService(req, orgId, data) {
  const {
    customerId,
    productId,
    quantity,
    unitPrice,
    discount = 0,
    channel,
    region,
    soldAt = new Date().toISOString(),
    notes,
    decrementInventory = false,
  } = data;

  // 1. Verify Customer belongs to this org (prevent cross-tenant data leak)
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
      select: { id: true },
    });
    if (!customer) return { customerNotFound: true };
  }

  // 2. Verify Product belongs to this org
  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId: orgId },
      select: { id: true },
    });
    if (!product) return { productNotFound: true };
  }

  // 3. Compute totalAmount
  const subtotal = quantity * unitPrice;
  const totalAmount = Math.max(0, subtotal - discount);
  const soldDate = new Date(soldAt);

  // 4. Atomic Execution
  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        organizationId: orgId,
        customerId: customerId || null,
        productId: productId || null,
        quantity,
        unitPrice,
        discount,
        totalAmount,
        channel,
        region,
        soldAt: soldDate,
        notes,
      },
      select: SALE_SELECT,
    });

    // Update Customer's totalRevenue and lastOrderAt
    if (customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalRevenue: { increment: totalAmount },
          lastOrderAt: soldDate,
        },
      });
    }

    // Optionally decrement linked Inventory item
    if (decrementInventory && productId) {
      const invItem = await tx.inventoryItem.findFirst({
        where: { productId, organizationId: orgId, isArchived: false },
        select: { id: true, quantity: true },
      });

      if (invItem) {
        const newQty = Math.max(0, invItem.quantity - quantity);
        await tx.inventoryItem.update({
          where: { id: invItem.id },
          data: { quantity: newQty },
        });
      }
    }

    return createdSale;
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'Sale',
    entityId: sale.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'SALE_RECORDED', totalAmount, quantity },
  });

  return { sale };
}

// ── UPDATE SALE ────────────────────────────────────────────────
export async function updateSaleService(req, orgId, saleId, updates) {
  const existing = await prisma.sale.findFirst({
    where: { id: saleId, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) return { notFound: true };

  const data = {
    ...updates,
    ...(updates.soldAt && { soldAt: new Date(updates.soldAt) }),
  };

  const sale = await prisma.sale.update({
    where: { id: saleId },
    data,
    select: SALE_SELECT,
  });

  return { sale };
}

// ── DELETE / VOID SALE (Atomic Rollback) ───────────────────────
export async function deleteSaleService(req, orgId, saleId) {
  const existing = await prisma.sale.findFirst({
    where: { id: saleId, organizationId: orgId },
    select: { id: true, customerId: true, totalAmount: true },
  });

  if (!existing) return { notFound: true };

  await prisma.$transaction(async (tx) => {
    // Deduct revenue from customer if was linked
    if (existing.customerId) {
      await tx.customer.update({
        where: { id: existing.customerId },
        data: {
          totalRevenue: { decrement: existing.totalAmount },
        },
      });
    }

    await tx.sale.delete({ where: { id: saleId } });
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'Sale',
    entityId: saleId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'SALE_VOIDED', amount: existing.totalAmount },
  });

  return { success: true };
}

// ── SALES TRENDS & AGGREGATION ─────────────────────────────────
export async function getSalesTrendsService(orgId, query) {
  const where = {
    organizationId: orgId,
    ...(query.startDate || query.endDate ? {
      soldAt: {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate) }),
      },
    } : {}),
  };

  const [sales, channelAgg] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { soldAt: 'asc' },
      select: { totalAmount: true, soldAt: true, quantity: true, channel: true },
    }),
    prisma.sale.groupBy({
      by: ['channel'],
      where: { ...where, channel: { not: null } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
  ]);

  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
  const totalOrders = sales.length;
  const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: Number(averageOrderValue),
    channels: channelAgg.map((c) => ({
      channel: c.channel,
      revenue: c._sum.totalAmount || 0,
      orderCount: c._count.id,
    })),
  };
}
