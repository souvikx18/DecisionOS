// src/modules/inventory/inventory.service.js
// ============================================================
// Inventory Business Logic (Multi-Tenant Scoped)
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { parsePagination, formatPaginationMeta } from '../../lib/pagination.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';

// Shared inventory select
const INVENTORY_SELECT = {
  id: true,
  name: true,
  sku: true,
  quantity: true,
  reorderLevel: true,
  reorderQty: true,
  warehouseLocation: true,
  lastRestockedAt: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: { id: true, name: true, sku: true, category: true, sellingPrice: true, costPrice: true },
  },
};

// ── LIST INVENTORY ITEMS ───────────────────────────────────────
export async function listInventoryService(orgId, query) {
  const { page, limit, skip, take, orderBy, search } = parsePagination(query, {
    defaultSortBy: 'quantity',
    defaultSortOrder: 'asc',
  });

  const where = {
    organizationId: orgId,
    ...(query.isArchived !== undefined
      ? { isArchived: query.isArchived === 'true' }
      : { isArchived: false }),
    ...(query.warehouseLocation && {
      warehouseLocation: { contains: query.warehouseLocation, mode: 'insensitive' },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { warehouseLocation: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      skip,
      take,
      orderBy,
      select: INVENTORY_SELECT,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  // Compute status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK'
  const formatted = items.map((item) => {
    let stockStatus = 'IN_STOCK';
    if (item.quantity === 0) stockStatus = 'OUT_OF_STOCK';
    else if (item.quantity <= item.reorderLevel) stockStatus = 'LOW_STOCK';

    return {
      ...item,
      stockStatus,
      isLowStock: item.quantity <= item.reorderLevel,
    };
  });

  // Filter lowStockOnly in memory if requested
  const filtered = query.lowStockOnly === 'true'
    ? formatted.filter((item) => item.isLowStock)
    : formatted;

  return {
    inventory: filtered,
    meta: formatPaginationMeta(total, page, limit),
  };
}

// ── GET SINGLE INVENTORY ITEM ──────────────────────────────────
export async function getInventoryItemService(orgId, itemId) {
  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, organizationId: orgId },
    select: INVENTORY_SELECT,
  });

  if (!item) return { notFound: true };

  let stockStatus = 'IN_STOCK';
  if (item.quantity === 0) stockStatus = 'OUT_OF_STOCK';
  else if (item.quantity <= item.reorderLevel) stockStatus = 'LOW_STOCK';

  return {
    item: {
      ...item,
      stockStatus,
      isLowStock: item.quantity <= item.reorderLevel,
    },
  };
}

// ── CREATE INVENTORY ITEM ──────────────────────────────────────
export async function createInventoryItemService(req, orgId, data) {
  if (data.productId) {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, organizationId: orgId },
      select: { id: true },
    });
    if (!product) return { productNotFound: true };
  }

  const item = await prisma.inventoryItem.create({
    data: {
      ...data,
      organizationId: orgId,
      lastRestockedAt: data.quantity > 0 ? new Date() : null,
    },
    select: INVENTORY_SELECT,
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'InventoryItem',
    entityId: item.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'INVENTORY_CREATED', name: item.name, quantity: item.quantity },
  });

  return { item };
}

// ── UPDATE INVENTORY ITEM ──────────────────────────────────────
export async function updateInventoryItemService(req, orgId, itemId, updates) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: itemId, organizationId: orgId },
    select: { id: true, quantity: true },
  });

  if (!existing) return { notFound: true };

  const isRestocking = updates.quantity !== undefined && updates.quantity > existing.quantity;

  const item = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      ...updates,
      ...(isRestocking && { lastRestockedAt: new Date() }),
    },
    select: INVENTORY_SELECT,
  });

  return { item };
}

// ── QUICK STOCK ADJUSTMENT (+ / -) ─────────────────────────────
export async function adjustStockService(req, orgId, itemId, { adjustment, reason }) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: itemId, organizationId: orgId },
    select: { id: true, name: true, quantity: true },
  });

  if (!existing) return { notFound: true };

  const newQuantity = Math.max(0, existing.quantity + adjustment);
  const isRestock = adjustment > 0;

  const item = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      quantity: newQuantity,
      ...(isRestock && { lastRestockedAt: new Date() }),
    },
    select: INVENTORY_SELECT,
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'InventoryItem',
    entityId: itemId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: {
      event: 'STOCK_ADJUSTED',
      previousQty: existing.quantity,
      adjustment,
      newQty: newQuantity,
      reason,
    },
  });

  return {
    item: {
      ...item,
      previousQuantity: existing.quantity,
      adjustment,
      reason,
    },
  };
}

// ── ARCHIVE INVENTORY ITEM ─────────────────────────────────────
export async function archiveInventoryItemService(req, orgId, itemId) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: itemId, organizationId: orgId },
    select: { id: true, isArchived: true },
  });

  if (!existing) return { notFound: true };

  const item = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { isArchived: !existing.isArchived },
    select: { id: true, isArchived: true },
  });

  return { item };
}

// ── INVENTORY ALERTS & SUMMARY ─────────────────────────────────
export async function getInventoryAlertsService(orgId) {
  const allItems = await prisma.inventoryItem.findMany({
    where: { organizationId: orgId, isArchived: false },
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
      reorderLevel: true,
      reorderQty: true,
      warehouseLocation: true,
      product: {
        select: { sellingPrice: true, costPrice: true },
      },
    },
  });

  const lowStockAlerts = allItems.filter((i) => i.quantity <= i.reorderLevel);
  const totalStockCount = allItems.reduce((sum, i) => sum + i.quantity, 0);

  // Total inventory valuation based on product cost price
  const totalValuation = allItems.reduce((sum, i) => {
    const cost = Number(i.product?.costPrice || 0);
    return sum + (cost * i.quantity);
  }, 0);

  return {
    totalItems: allItems.length,
    totalUnits: totalStockCount,
    totalValuation: Number(totalValuation.toFixed(2)),
    alertCount: lowStockAlerts.length,
    alerts: lowStockAlerts,
  };
}
