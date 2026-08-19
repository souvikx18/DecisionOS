// src/modules/members/members.controller.js
// ============================================================
// Members Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import { changeRoleSchema } from './members.schema.js';
import {
  listMembersService, getMemberService, changeRoleService,
  removeMemberService, leaveOrgService,
} from './members.service.js';

// ── GET /api/v1/members ────────────────────────────────────────
export async function listMembers(req, res) {
  const members = await listMembersService(req.org.id);
  return sendSuccess(res, { members, total: members.length });
}

// ── GET /api/v1/members/:id ────────────────────────────────────
export async function getMember(req, res) {
  const result = await getMemberService(req.org.id, req.params.id);
  if (result.notFound) return sendError(res, 404, 'MEMBER_NOT_FOUND', 'Member not found.');
  return sendSuccess(res, result);
}

// ── PATCH /api/v1/members/:id/role ────────────────────────────
export async function changeRole(req, res) {
  const parsed = changeRoleSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await changeRoleService(req, req.org.id, req.params.id, parsed.data.role);

  if (result.notFound) return sendError(res, 404, 'MEMBER_NOT_FOUND', 'Member not found.');
  if (result.selfChange) return sendError(res, 400, 'SELF_ROLE_CHANGE', 'You cannot change your own role.');
  if (result.cannotChangeOwner) return sendError(res, 403, 'CANNOT_CHANGE_OWNER', 'The owner\'s role cannot be changed. Transfer ownership first.');
  if (result.insufficientRank) return sendError(res, 403, 'INSUFFICIENT_PERMISSIONS', 'You cannot assign a role equal to or higher than your own.');

  return sendSuccess(res, result);
}

// ── DELETE /api/v1/members/:id ─────────────────────────────────
export async function removeMember(req, res) {
  const result = await removeMemberService(req, req.org.id, req.params.id);

  if (result.notFound) return sendError(res, 404, 'MEMBER_NOT_FOUND', 'Member not found.');
  if (result.selfRemove) return sendError(res, 400, 'SELF_REMOVE', 'Use /members/me/leave to leave the organization.');
  if (result.insufficientRank) return sendError(res, 403, 'INSUFFICIENT_PERMISSIONS', 'You cannot remove a member with an equal or higher role.');
  if (result.lastOwner) return sendError(res, 400, 'LAST_OWNER', 'Cannot remove the last owner. Transfer ownership first.');

  return sendSuccess(res, null, 200, 'Member removed successfully.');
}

// ── DELETE /api/v1/members/me/leave ───────────────────────────
export async function leaveOrg(req, res) {
  const result = await leaveOrgService(req, req.org.id);

  if (result.lastOwner) {
    return sendError(
      res, 400, 'LAST_OWNER',
      'You are the only owner. Transfer ownership to another member before leaving.'
    );
  }

  return sendSuccess(res, null, 200, 'You have left the organization.');
}
