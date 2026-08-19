// src/modules/organizations/org.controller.js
// ============================================================
// Organization Controllers — thin layer over service
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import { createOrgSchema, updateOrgSchema, switchOrgSchema } from './org.schema.js';
import {
  createOrgService, getOrgService, updateOrgService,
  getMyOrgsService, deleteOrgService,
} from './org.service.js';

// ── POST /api/v1/organizations ─────────────────────────────────
export async function createOrg(req, res) {
  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await createOrgService(req, parsed.data);
  return sendSuccess(res, result, 201);
}

// ── GET /api/v1/organizations/me ───────────────────────────────
export async function getOrg(req, res) {
  const org = await getOrgService(req.org.id);
  return sendSuccess(res, { organization: org });
}

// ── PATCH /api/v1/organizations/me ────────────────────────────
export async function updateOrg(req, res) {
  const parsed = updateOrgSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const org = await updateOrgService(req, req.org.id, parsed.data);
  return sendSuccess(res, { organization: org });
}

// ── GET /api/v1/organizations/my-orgs ─────────────────────────
export async function getMyOrgs(req, res) {
  const orgs = await getMyOrgsService(req.user.id);
  return sendSuccess(res, { organizations: orgs });
}

// ── DELETE /api/v1/organizations/me ───────────────────────────
export async function deleteOrg(req, res) {
  const result = await deleteOrgService(req, req.org.id);

  if (result.hasPaidSubscription) {
    return sendError(
      res, 400, 'ACTIVE_SUBSCRIPTION',
      'You have an active paid subscription. Please cancel it before deleting your organization.'
    );
  }

  return sendSuccess(res, null, 200, 'Organization deleted successfully.');
}
