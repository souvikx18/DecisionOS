// src/modules/inventory/inventory.controller.js
// ============================================================
// Inventory Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  adjustStockSchema,
  listInventoryQuerySchema,
} from './inventory.schema.js';
import {
  listInventoryService,
  getInventoryItemService,
  createInventoryItemService,
  updateInventoryItemService,
  adjustStockService,
  archiveInventoryItemService,
  getInventoryAlertsService,
} from './inventory.service.js';

// ── GET /api/v1/inventory ──────────────────────────────────────
export async function listInventory(req, res) {
  const parsed = listInventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await listInventoryService(req.org.id, parsed.data);
  return sendSuccess(res, result.inventory, 200, null, result.meta);
}

// ── GET /api/v1/inventory/summary/alerts ───────────────────────
export async function getInventoryAlerts(req, res) {
  const alerts = await getInventoryAlertsService(req.org.id);
  return sendSuccess(res, alerts);
}

// ── GET /api/v1/inventory/:id ──────────────────────────────────
export async function getInventoryItem(req, res) {
  const result = await getInventoryItemService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'ITEM_NOT_FOUND', 'Inventory item not found.');
  return sendSuccess(res, result.item);
}

// ── POST /api/v1/inventory ─────────────────────────────────────
export async function createInventoryItem(req, res) {
  const parsed = createInventoryItemSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await createInventoryItemService(req, req.org.id, parsed.data);
  if (result.productNotFound) {
    return sendError(res, 400, 'PRODUCT_NOT_FOUND', 'The linked product does not exist in your organization.');
  }

  return sendSuccess(res, result.item, 201, 'Inventory item created successfully.');
}

// ── PATCH /api/v1/inventory/:id ────────────────────────────────
export async function updateInventoryItem(req, res) {
  const parsed = updateInventoryItemSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await updateInventoryItemService(req, req.org.id, req.params.id, parsed.data);
  if (result.notFound) return sendError(res, 404, 'ITEM_NOT_FOUND', 'Inventory item not found.');

  return sendSuccess(res, result.item, 200, 'Inventory item updated successfully.');
}

// ── POST /api/v1/inventory/:id/adjust ──────────────────────────
export async function adjustStock(req, res) {
  const parsed = adjustStockSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await adjustStockService(req, req.org.id, req.params.id, parsed.data);
  if (result.notFound) return sendError(res, 404, 'ITEM_NOT_FOUND', 'Inventory item not found.');

  return sendSuccess(res, result.item, 200, 'Stock level adjusted successfully.');
}

// ── DELETE /api/v1/inventory/:id ───────────────────────────────
export async function archiveInventoryItem(req, res) {
  const result = await archiveInventoryItemService(req, req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'ITEM_NOT_FOUND', 'Inventory item not found.');

  const action = result.item.isArchived ? 'archived' : 'unarchived';
  return sendSuccess(res, result.item, 200, `Inventory item ${action} successfully.`);
}
