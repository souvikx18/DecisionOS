// src/modules/realtime/realtime.router.js
// ============================================================
// Realtime Stream Routes (SSE Stream Fallback)
// ============================================================

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrg } from '../../middleware/org.middleware.js';
import { handleSSEStream } from '../../lib/realtime.js';

const router = Router();

// SSE Stream endpoint requires authentication and org context
router.get('/stream', requireAuth, requireOrg, handleSSEStream);

export default router;
