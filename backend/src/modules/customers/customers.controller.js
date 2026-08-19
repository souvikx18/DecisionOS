// src/modules/customers/customers.controller.js
// ============================================================
// Customers Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from './customers.schema.js';
import {
  listCustomersService,
  getCustomerService,
  createCustomerService,
  updateCustomerService,
  archiveCustomerService,
  getCustomerMetricsService,
} from './customers.service.js';

// ── GET /api/v1/customers ──────────────────────────────────────
export async function listCustomers(req, res) {
  const parsed = listCustomersQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await listCustomersService(req.org.id, parsed.data);
  return sendSuccess(res, result.customers, 200, null, result.meta);
}

// ── GET /api/v1/customers/summary/metrics ──────────────────────
export async function getCustomerMetrics(req, res) {
  const metrics = await getCustomerMetricsService(req.org.id);
  return sendSuccess(res, metrics);
}

// ── GET /api/v1/customers/:id ──────────────────────────────────
export async function getCustomer(req, res) {
  const result = await getCustomerService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
  return sendSuccess(res, result.customer);
}

// ── POST /api/v1/customers ─────────────────────────────────────
export async function createCustomer(req, res) {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await createCustomerService(req, req.org.id, parsed.data);
  return sendSuccess(res, result.customer, 201, 'Customer created successfully.');
}

// ── PATCH /api/v1/customers/:id ────────────────────────────────
export async function updateCustomer(req, res) {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await updateCustomerService(req, req.org.id, req.params.id, parsed.data);
  if (result.notFound) return sendError(res, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
  return sendSuccess(res, result.customer, 200, 'Customer updated successfully.');
}

// ── DELETE /api/v1/customers/:id ───────────────────────────────
export async function archiveCustomer(req, res) {
  const result = await archiveCustomerService(req, req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');

  const action = result.customer.isArchived ? 'archived' : 'unarchived';
  return sendSuccess(res, result.customer, 200, `Customer ${action} successfully.`);
}
