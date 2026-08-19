// src/modules/customers/customers.service.js
// ============================================================
// Customers Business Logic (Multi-Tenant Scoped)
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { parsePagination, formatPaginationMeta } from '../../lib/pagination.js';
import { logAudit, getIpAddress, getUserAgent } from '../../lib/audit.js';

// Shared customer select
const CUSTOMER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  region: true,
  segment: true,
  totalRevenue: true,
  lastOrderAt: true,
  churnRisk: true,
  tags: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
};

// ── LIST CUSTOMERS ─────────────────────────────────────────────
export async function listCustomersService(orgId, query) {
  const { page, limit, skip, take, orderBy, search } = parsePagination(query, {
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  });

  const where = {
    organizationId: orgId,
    ...(query.isArchived !== undefined
      ? { isArchived: query.isArchived === 'true' }
      : { isArchived: false }),
    ...(query.segment && { segment: { equals: query.segment, mode: 'insensitive' } }),
    ...(query.region && { region: { equals: query.region, mode: 'insensitive' } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy,
      select: CUSTOMER_SELECT,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    meta: formatPaginationMeta(total, page, limit),
  };
}

// ── GET CUSTOMER DETAILS ───────────────────────────────────────
export async function getCustomerService(orgId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    select: {
      ...CUSTOMER_SELECT,
      metadata: true,
      sales: {
        take: 10,
        orderBy: { soldAt: 'desc' },
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          channel: true,
          soldAt: true,
          product: { select: { id: true, name: true, sku: true } },
        },
      },
      _count: { select: { sales: true } },
    },
  });

  if (!customer) return { notFound: true };
  return { customer };
}

// ── CREATE CUSTOMER ────────────────────────────────────────────
export async function createCustomerService(req, orgId, data) {
  const customer = await prisma.customer.create({
    data: {
      ...data,
      organizationId: orgId,
    },
    select: CUSTOMER_SELECT,
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'Customer',
    entityId: customer.id,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'CUSTOMER_CREATED', name: customer.name },
  });

  return { customer };
}

// ── UPDATE CUSTOMER ────────────────────────────────────────────
export async function updateCustomerService(req, orgId, customerId, updates) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) return { notFound: true };

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: updates,
    select: CUSTOMER_SELECT,
  });

  await logAudit({
    action: 'SETTINGS_UPDATED',
    userId: req.user.id,
    orgId,
    entityType: 'Customer',
    entityId: customerId,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    metadata: { event: 'CUSTOMER_UPDATED', fields: Object.keys(updates) },
  });

  return { customer };
}

// ── ARCHIVE CUSTOMER ───────────────────────────────────────────
export async function archiveCustomerService(req, orgId, customerId) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    select: { id: true, isArchived: true },
  });

  if (!existing) return { notFound: true };

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { isArchived: !existing.isArchived },
    select: { id: true, isArchived: true },
  });

  return { customer };
}

// ── CUSTOMER METRICS & SUMMARY ─────────────────────────────────
export async function getCustomerMetricsService(orgId) {
  const [totalCount, revenueAgg, highRiskCount, topCustomers] = await Promise.all([
    prisma.customer.count({ where: { organizationId: orgId, isArchived: false } }),
    prisma.customer.aggregate({
      where: { organizationId: orgId, isArchived: false },
      _sum: { totalRevenue: true },
      _avg: { totalRevenue: true },
    }),
    prisma.customer.count({
      where: { organizationId: orgId, isArchived: false, churnRisk: { gte: 0.7 } },
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId, isArchived: false },
      take: 5,
      orderBy: { totalRevenue: 'desc' },
      select: { id: true, name: true, totalRevenue: true, company: true },
    }),
  ]);

  return {
    totalCustomers: totalCount,
    totalRevenue: revenueAgg._sum.totalRevenue || 0,
    averageRevenuePerCustomer: revenueAgg._avg.totalRevenue || 0,
    highChurnRiskCount: highRiskCount,
    topCustomers,
  };
}
