// src/lib/realtime.js
// ============================================================
// DecisionOS Real-Time Event Hub (WebSockets + SSE Fallback)
// Multi-Tenant Isolated Event Streaming across Background Workers & Clients
// ============================================================

import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from './prisma.js';
import { getSession } from '../modules/auth/auth.helpers.js';

// Connection registries for multi-tenant isolation
const orgSockets = new Map(); // orgId -> Set<WebSocket>
const userSockets = new Map(); // userId -> Set<WebSocket>
const orgSSEClients = new Map(); // orgId -> Set<Response>

let wss = null;
let heartbeatTimer = null;

/**
 * Parse cookies from raw cookie header string
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    const value = parts.slice(1).join('=').trim();
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

/**
 * Authenticate handshake request via cookie or token query parameter
 */
async function authenticateHandshake(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const tokenQuery = url.searchParams.get('token');
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = tokenQuery || cookies.session;

    if (!sessionToken) return null;

    const sessionPayload = await getSession(sessionToken);
    if (!sessionPayload?.userId) return null;

    // Fetch user and primary active organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: sessionPayload.userId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!membership) return null;

    return {
      userId: membership.userId,
      orgId: membership.organizationId,
      user: membership.user,
      org: membership.organization,
    };
  } catch (err) {
    console.error('[Realtime] Auth error during handshake:', err.message);
    return null;
  }
}

/**
 * Initialize WebSocket Server attached to Node HTTP server
 */
export function initRealtime(server) {
  if (wss) return wss;

  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const auth = await authenticateHandshake(req);

    if (!auth) {
      ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Unauthorized session.' }));
      ws.close(4001, 'Unauthorized');
      return;
    }

    ws.userId = auth.userId;
    ws.orgId = auth.orgId;
    ws.user = auth.user;

    // Register in Org pool
    if (!orgSockets.has(auth.orgId)) {
      orgSockets.set(auth.orgId, new Set());
    }
    orgSockets.get(auth.orgId).add(ws);

    // Register in User pool
    if (!userSockets.has(auth.userId)) {
      userSockets.set(auth.userId, new Set());
    }
    userSockets.get(auth.userId).add(ws);

    // Send welcome confirmation
    ws.send(
      JSON.stringify({
        type: 'CONNECTED',
        data: {
          userId: auth.userId,
          orgId: auth.orgId,
          connectedAt: new Date().toISOString(),
        },
      })
    );

    // Handle messages
    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch {
        // ignore non-json
      }
    });

    // Cleanup on disconnect
    const cleanup = () => {
      if (orgSockets.has(ws.orgId)) {
        orgSockets.get(ws.orgId).delete(ws);
        if (orgSockets.get(ws.orgId).size === 0) orgSockets.delete(ws.orgId);
      }
      if (userSockets.has(ws.userId)) {
        userSockets.get(ws.userId).delete(ws);
        if (userSockets.get(ws.userId).size === 0) userSockets.delete(ws.userId);
      }
    };

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });

  // Heartbeat to prune dead connections every 30s
  heartbeatTimer = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('⚡ [Realtime] WebSocket Hub initialized on /ws');
  return wss;
}

/**
 * Broadcast event to all connected clients in a specific organization
 */
export function broadcastToOrg(orgId, eventType, data = {}) {
  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  });

  // 1. Send to WebSockets
  const sockets = orgSockets.get(orgId);
  if (sockets) {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // 2. Send to SSE Clients
  const sseClients = orgSSEClients.get(orgId);
  if (sseClients) {
    const sseMessage = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach((res) => {
      try {
        res.write(sseMessage);
      } catch {
        // handled on close
      }
    });
  }
}

/**
 * Send event directly to a specific user
 */
export function sendToUser(userId, eventType, data = {}) {
  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  });

  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

/**
 * Handle Server-Sent Events (SSE) stream endpoint
 */
export function handleSSEStream(req, res) {
  const orgId = req.org?.id;
  if (!orgId) {
    return res.status(401).json({ error: 'Organization context required for SSE.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  if (!orgSSEClients.has(orgId)) {
    orgSSEClients.set(orgId, new Set());
  }
  orgSSEClients.get(orgId).add(res);

  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ orgId, time: new Date().toISOString() })}\n\n`);

  const keepAliveTimer = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    if (orgSSEClients.has(orgId)) {
      orgSSEClients.get(orgId).delete(res);
      if (orgSSEClients.get(orgId).size === 0) orgSSEClients.delete(orgId);
    }
  });
}

/**
 * Gracefully close real-time server
 */
export async function closeRealtime() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (wss) {
    wss.clients.forEach((ws) => ws.terminate());
    await new Promise((resolve) => wss.close(resolve));
    wss = null;
  }
}
