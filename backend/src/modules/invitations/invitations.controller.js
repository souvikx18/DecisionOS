// src/modules/invitations/invitations.controller.js
// ============================================================
// Invitation Controllers
// ============================================================

import { sendSuccess, sendError, sendValidationError } from '../../lib/response.js';
import { sendInvitationSchema, acceptInvitationSchema, previewInvitationSchema } from './invitations.schema.js';
import {
  sendInvitationService, listInvitationsService, cancelInvitationService,
  previewInvitationService, acceptInvitationService,
} from './invitations.service.js';

// ── POST /api/v1/invitations ───────────────────────────────────
export async function sendInvitation(req, res) {
  const parsed = sendInvitationSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await sendInvitationService(req, req.org.id, parsed.data);

  if (result.seatLimitReached) {
    return sendError(
      res, 402, 'SEAT_LIMIT_REACHED',
      `Your ${result.tier} plan allows a maximum of ${result.max} members (current: ${result.current}). Please upgrade your plan to add more members.`
    );
  }

  if (result.alreadyMember) {
    return sendError(res, 409, 'ALREADY_MEMBER', 'This person is already a member of your organization.');
  }

  if (result.alreadyInvited) {
    return sendError(res, 409, 'ALREADY_INVITED', 'An invitation has already been sent to this email address.');
  }

  return sendSuccess(
    res,
    { invitation: result.invitation },
    201,
    `Invitation sent to ${result.invitation.email}.`
  );
}

// ── GET /api/v1/invitations ────────────────────────────────────
export async function listInvitations(req, res) {
  const invitations = await listInvitationsService(req.org.id);
  return sendSuccess(res, { invitations, total: invitations.length });
}

// ── DELETE /api/v1/invitations/:id ────────────────────────────
export async function cancelInvitation(req, res) {
  const result = await cancelInvitationService(req, req.org.id, req.params.id);

  if (result.notFound) return sendError(res, 404, 'INVITATION_NOT_FOUND', 'Invitation not found.');
  if (result.alreadyAccepted) return sendError(res, 400, 'ALREADY_ACCEPTED', 'This invitation has already been accepted and cannot be cancelled.');

  return sendSuccess(res, null, 200, 'Invitation cancelled successfully.');
}

// ── GET /api/v1/invitations/accept?token=xxx ──────────────────
export async function previewInvitation(req, res) {
  const parsed = previewInvitationSchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 400, 'MISSING_TOKEN', 'Invitation token is required.');
  }

  const result = await previewInvitationService(parsed.data.token);

  if (result.invalid) return sendError(res, 400, 'INVALID_TOKEN', 'This invitation link is invalid.');
  if (result.alreadyAccepted) return sendError(res, 400, 'ALREADY_ACCEPTED', 'This invitation has already been accepted.');
  if (result.expired) return sendError(res, 400, 'INVITATION_EXPIRED', 'This invitation has expired. Please ask for a new invite.');

  return sendSuccess(res, result);
}

// ── POST /api/v1/invitations/accept ───────────────────────────
export async function acceptInvitation(req, res) {
  const parsed = acceptInvitationSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);

  const result = await acceptInvitationService(req, res, parsed.data);

  if (result.invalid) return sendError(res, 400, 'INVALID_TOKEN', 'This invitation link is invalid.');
  if (result.alreadyAccepted) return sendError(res, 400, 'ALREADY_ACCEPTED', 'This invitation has already been accepted.');
  if (result.expired) return sendError(res, 400, 'INVITATION_EXPIRED', 'This invitation has expired. Please request a new invite.');
  if (result.orgNotActive) return sendError(res, 403, 'ORG_NOT_ACTIVE', 'This organization is no longer active.');
  if (result.alreadyMember) return sendError(res, 409, 'ALREADY_MEMBER', 'You are already a member of this organization.');

  if (result.needsAccount) {
    return sendError(
      res, 400, 'ACCOUNT_REQUIRED',
      'Please provide firstName, lastName, and password to create your account.'
    );
  }

  return sendSuccess(res, result, 200, `Welcome to ${result.organization.name}! You have successfully joined.`);
}
