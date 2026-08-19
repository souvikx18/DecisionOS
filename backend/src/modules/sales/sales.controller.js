// src/modules/sales/sales.controller.js
// ============================================================
// Sales Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import {
  createSaleSchema,
  updateSaleSchema,
  listSalesQuerySchema,
} from './sales.schema.js';
import {
  listSalesService,
  getSaleService,
  createSaleService,
  updateSaleService,
  deleteSaleService,
  getSalesTrendsService,
} from './sales.service.js';

// ── GET /api/v1/sales ──────────────────────────────────────────
export async function listSales(req, res) {
  const parsed = listSalesQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await listSalesService(req.org.id, parsed.data);
  return sendSuccess(res, { sales: result.sales, summary: result.summary }, 200, null, result.meta);
}

// ── GET /api/v1/sales/summary/trends ───────────────────────────
export async function getSalesTrends(req, res) {
  const trends = await getSalesTrendsService(req.org.id, req.query);
  return sendSuccess(res, trends);
}

// ── GET /api/v1/sales/:id ──────────────────────────────────────
export async function getSale(req, res) {
  const result = await getSaleService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'SALE_NOT_FOUND', 'Sale transaction not found.');
  return sendSuccess(res, result.sale);
}

// ── POST /api/v1/sales ─────────────────────────────────────────
export async function createSale(req, res) {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await createSaleService(req, req.org.id, parsed.data);
  if (result.customerNotFound) {
    return sendError(res, 400, 'CUSTOMER_NOT_FOUND', 'The specified customer does not exist in your organization.');
  }
  if (result.productNotFound) {
    return sendError(res, 400, 'PRODUCT_NOT_FOUND', 'The specified product does not exist in your organization.');
  }

  return sendSuccess(res, result.sale, 201, 'Sale recorded successfully.');
}

// ── PATCH /api/v1/sales/:id ────────────────────────────────────
export async function updateSale(req, res) {
  const parsed = updateSaleSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await updateSaleService(req, req.org.id, req.params.id, parsed.data);
  if (result.notFound) return sendError(res, 404, 'SALE_NOT_FOUND', 'Sale transaction not found.');

  return sendSuccess(res, result.sale, 200, 'Sale updated successfully.');
}

// ── DELETE /api/v1/sales/:id ───────────────────────────────────
export async function deleteSale(req, res) {
  const result = await deleteSaleService(req, req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'SALE_NOT_FOUND', 'Sale transaction not found.');

  return sendSuccess(res, null, 200, 'Sale voided and customer revenue reverted successfully.');
}
