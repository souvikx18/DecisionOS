// src/modules/invitations/invitations.router.js
// ============================================================
// Invitation Routes
// Mixed: some routes are public (accept/preview), others need auth+org
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { authGeneralLimiter, verifyEmailLimiter } from '../../middleware/rateLimit.middleware.js';

import {
  sendInvitation, listInvitations, cancelInvitation,
  previewInvitation, acceptInvitation,
} from './invitations.controller.js';

const router = Router();

// ── Public routes (no auth needed — token is the credential) ──
// NOTE: /accept must be BEFORE /:id to avoid route conflict
router.get('/accept',  verifyEmailLimiter, previewInvitation);
router.post('/accept', verifyEmailLimiter, acceptInvitation);

// ── Protected routes (MANAGE_MEMBERS permission) ───────────────
router.use(requireAuth, requireOrg, requirePermission('MANAGE_MEMBERS'));

router.post('/',     authGeneralLimiter, sendInvitation);
router.get('/',      authGeneralLimiter, listInvitations);
router.delete('/:id', authGeneralLimiter, cancelInvitation);

export default router;
