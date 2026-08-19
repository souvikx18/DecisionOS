// src/modules/products/products.service.js
// ============================================================
// Products Business Logic (Multi-Tenant Scoped)
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { parsePagination, formatPaginationMeta } from '../../lib/pagination.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';

// Shared product select
const PRODUCT_SELECT = {
  id: true,
  name: true,
  sku: true,
  category: true,
  unit: true,
  costPrice: true,
  sellingPrice: true,
  isActive: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
};

// ── LIST PRODUCTS ──────────────────────────────────────────────
export async function listProductsService(orgId, query) {
  const { page, limit, skip, take, orderBy, search } = parsePagination(query, {
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  });

  const where = {
    organizationId: orgId,
    ...(query.isArchived !== undefined
      ? { isArchived: query.isArchived === 'true' }
      : { isArchived: false }),
    ...(query.isActive !== undefined && { isActive: query.isActive === 'true' }),
    ...(query.category && { category: { equals: query.category, mode: 'insensitive' } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        ...PRODUCT_SELECT,
        inventory: {
          select: { quantity: true, reorderLevel: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Compute margin percentage and aggregate inventory stock
  const formatted = products.map((p) => {
    const cost = Number(p.costPrice) || 0;
    const selling = Number(p.sellingPrice) || 0;
    const marginPercent = selling > 0 ? (((selling - cost) / selling) * 100).toFixed(1) : 0;
    const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);

    const { inventory, ...rest } = p;
    return {
      ...rest,
      marginPercent: Number(marginPercent),
      totalStock,
    };
  });

  return {
    products: formatted,
    meta: formatPaginationMeta(total, page, limit),
  };
}

// ── GET PRODUCT DETAILS ────────────────────────────────────────
export async function getProductService(orgId, productId) {
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId: orgId },
    select: {
      ...PRODUCT_SELECT,
      inventory: {
        select: {
          id: true,
          name: true,
          quantity: true,
          reorderLevel: true,
          warehouseLocation: true,
        },
      },
      sales: {
        take: 10,
        orderBy: { soldAt: 'desc' },
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          soldAt: true,
          customer: { select: { id: true, name: true } },
        },
      },
      _count: { select: { sales: true } },
    },
  });

  if (!product) return { notFound: true };

  const cost = Number(product.costPrice) || 0;
  const selling = Number(product.sellingPrice) || 0;
  const marginPercent = selling > 0 ? (((selling - cost) / selling) * 100).toFixed(1) : 0;

  return {
    product: {
      ...product,
      marginPercent: Number(marginPercent),
    },
  };
}

// ── CREATE PRODUCT ─────────────────────────────────────────────
export async function createProductService(req, orgId, data) {
  // Enforce unique SKU within the organization
  if (data.sku) {
    const existingSku = await prisma.product.findUnique({
      where: { organizationId_sku: { organizationId: orgId, sku: data.sku } },
      select: { id: true },
    });
    if (existingSku) return { duplicateSku: true };
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      organizationId: orgId,
    },
    select: PRODUCT_SELECT,
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'Product',
    entityId: product.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'PRODUCT_CREATED', name: product.name, sku: product.sku },
  });

  return { product };
}

// ── UPDATE PRODUCT ─────────────────────────────────────────────
export async function updateProductService(req, orgId, productId, updates) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, organizationId: orgId },
    select: { id: true, sku: true },
  });

  if (!existing) return { notFound: true };

  // Check SKU conflict if updating SKU
  if (updates.sku && updates.sku !== existing.sku) {
    const skuConflict = await prisma.product.findUnique({
      where: { organizationId_sku: { organizationId: orgId, sku: updates.sku } },
      select: { id: true },
    });
    if (skuConflict) return { duplicateSku: true };
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: updates,
    select: PRODUCT_SELECT,
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'Product',
    entityId: productId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'PRODUCT_UPDATED', fields: Object.keys(updates) },
  });

  return { product };
}

// ── ARCHIVE PRODUCT ────────────────────────────────────────────
export async function archiveProductService(req, orgId, productId) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, organizationId: orgId },
    select: { id: true, isArchived: true },
  });

  if (!existing) return { notFound: true };

  const product = await prisma.product.update({
    where: { id: productId },
    data: { isArchived: !existing.isArchived },
    select: { id: true, isArchived: true },
  });

  return { product };
}

// ── GET CATEGORIES LIST ────────────────────────────────────────
export async function getProductCategoriesService(orgId) {
  const categories = await prisma.product.findMany({
    where: { organizationId: orgId, category: { not: null }, isArchived: false },
    distinct: ['category'],
    select: { category: true },
  });

  return {
    categories: categories.map((c) => c.category).filter(Boolean),
  };
}
