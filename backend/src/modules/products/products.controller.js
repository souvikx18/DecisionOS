// src/modules/products/products.controller.js
// ============================================================
// Products Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from './products.schema.js';
import {
  listProductsService,
  getProductService,
  createProductService,
  updateProductService,
  archiveProductService,
  getProductCategoriesService,
} from './products.service.js';

// ── GET /api/v1/products ───────────────────────────────────────
export async function listProducts(req, res) {
  const parsed = listProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await listProductsService(req.org.id, parsed.data);
  return sendSuccess(res, result.products, 200, null, result.meta);
}

// ── GET /api/v1/products/categories/list ───────────────────────
export async function getProductCategories(req, res) {
  const result = await getProductCategoriesService(req.org.id);
  return sendSuccess(res, result);
}

// ── GET /api/v1/products/:id ───────────────────────────────────
export async function getProduct(req, res) {
  const result = await getProductService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  return sendSuccess(res, result.product);
}

// ── POST /api/v1/products ──────────────────────────────────────
export async function createProduct(req, res) {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await createProductService(req, req.org.id, parsed.data);
  if (result.duplicateSku) {
    return sendError(res, 409, 'DUPLICATE_SKU', `A product with SKU "${parsed.data.sku}" already exists in your organization.`);
  }

  return sendSuccess(res, result.product, 201, 'Product created successfully.');
}

// ── PATCH /api/v1/products/:id ─────────────────────────────────
export async function updateProduct(req, res) {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await updateProductService(req, req.org.id, req.params.id, parsed.data);
  if (result.notFound) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  if (result.duplicateSku) {
    return sendError(res, 409, 'DUPLICATE_SKU', `A product with SKU "${parsed.data.sku}" already exists in your organization.`);
  }

  return sendSuccess(res, result.product, 200, 'Product updated successfully.');
}

// ── DELETE /api/v1/products/:id ────────────────────────────────
export async function archiveProduct(req, res) {
  const result = await archiveProductService(req, req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found.');

  const action = result.product.isArchived ? 'archived' : 'unarchived';
  return sendSuccess(res, result.product, 200, `Product ${action} successfully.`);
}
