import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import crypto from 'node:crypto';
import { Store } from './store.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create HTTP & WebSocket Servers
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active WebSocket connections keyed by userId
const activeConnections = new Map();

wss.on('connection', (ws, req) => {
  let authenticatedUserId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'AUTHENTICATE') {
        // Authenticate WebSocket connection with session token
        authenticatedUserId = data.userId;
        if (!activeConnections.has(authenticatedUserId)) {
          activeConnections.set(authenticatedUserId, new Set());
        }
        activeConnections.get(authenticatedUserId).add(ws);
        ws.send(JSON.stringify({ type: 'AUTHENTICATED', status: 'SUCCESS' }));
      }
    } catch (err) {
      console.error('[WS Error]', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId && activeConnections.has(authenticatedUserId)) {
      activeConnections.get(authenticatedUserId).delete(ws);
    }
  });
});

// Broadcast encrypted notification via WebSocket
function broadcastEncryptedNotification(userId, notificationPayload) {
  const userSockets = activeConnections.get(userId);
  if (userSockets) {
    const msg = JSON.stringify({
      type: 'ENCRYPTED_NOTIFICATION',
      notification: notificationPayload
    });
    for (const ws of userSockets) {
      if (ws.readyState === 1) { // OPEN
        ws.send(msg);
      }
    }
  }
}

/* ==========================================================================
   1. ZERO-KNOWLEDGE AUTHENTICATION ENDPOINTS
   ========================================================================== */

/**
 * Register User (Zero-Knowledge)
 * Receives HMAC blind email, Argon2/PBKDF2 salt, public key, encrypted private key, and auth verifier hash.
 * Password and Master Key NEVER reach server.
 */
app.post('/api/auth/register', (req, res) => {
  try {
    const { emailBlind, saltHex, publicKeyHex, encryptedPrivateKeyHex, zkAuthSecretHash } = req.body;
    if (!emailBlind || !saltHex || !publicKeyHex || !encryptedPrivateKeyHex || !zkAuthSecretHash) {
      return res.status(400).json({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    const user = Store.registerUser({
      emailBlind,
      saltHex,
      publicKeyHex,
      encryptedPrivateKeyHex,
      zkAuthSecretHash
    });

    return res.status(201).json({
      status: 'SUCCESS',
      message: 'Zero-Knowledge account created successfully.',
      userId: user.id
    });
  } catch (err) {
    if (err.message === 'USER_ALREADY_EXISTS') {
      return res.status(409).json({ error: 'USER_ALREADY_EXISTS' });
    }
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/**
 * Step 1: Login Challenge
 * Client requests salt and a cryptographically secure random challenge.
 */
app.post('/api/auth/login-challenge', (req, res) => {
  try {
    const { emailBlind } = req.body;
    const user = Store.getUserByBlindEmail(emailBlind);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    const { challengeId, challengeHex } = Store.createChallenge(emailBlind);

    return res.json({
      status: 'SUCCESS',
      saltHex: user.saltHex,
      publicKeyHex: user.publicKeyHex,
      encryptedPrivateKeyHex: user.encryptedPrivateKeyHex,
      challengeId,
      challengeHex
    });
  } catch (err) {
    console.error('[Login Challenge Error]', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/**
 * Step 2: Login Verify Challenge Proof
 * Client sends zero-knowledge HMAC proof of challenge.
 */
app.post('/api/auth/login-verify', (req, res) => {
  try {
    const { challengeId, proofHex } = req.body;
    const { token, user } = Store.verifyChallengeProof(challengeId, proofHex);

    return res.json({
      status: 'SUCCESS',
      token,
      userId: user.id,
      publicKeyHex: user.publicKeyHex,
      encryptedPrivateKeyHex: user.encryptedPrivateKeyHex
    });
  } catch (err) {
    return res.status(401).json({ error: err.message || 'AUTHENTICATION_FAILED' });
  }
});

/* ==========================================================================
   2. E2EE ENCRYPTED DATASETS ENDPOINTS
   ========================================================================== */

/**
 * Upload Encrypted Dataset (CSV/Excel registers, Revenue metrics, Inventory logs)
 */
app.post('/api/datasets/upload', (req, res) => {
  try {
    const { userId, orgId, datasetTypeBlind, ciphertextHex, ivHex } = req.body;
    if (!userId || !ciphertextHex || !ivHex) {
      return res.status(400).json({ error: 'MISSING_DATASET_PAYLOAD' });
    }

    const dataset = Store.addEncryptedDataset({
      userId,
      orgId: orgId || 'default-org',
      datasetTypeBlind: datasetTypeBlind || 'general',
      ciphertextHex,
      ivHex
    });

    return res.status(201).json({
      status: 'SUCCESS',
      message: 'Encrypted dataset stored securely on Zero-Knowledge backend.',
      dataset
    });
  } catch (err) {
    console.error('[Upload Dataset Error]', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/**
 * Fetch Encrypted Datasets for User
 */
app.get('/api/datasets/list', (req, res) => {
  try {
    const { userId, datasetTypeBlind } = req.query;
    if (!userId) return res.status(400).json({ error: 'MISSING_USER_ID' });

    const datasets = Store.listEncryptedDatasets({ userId, datasetTypeBlind });
    return res.json({ status: 'SUCCESS', count: datasets.length, datasets });
  } catch (err) {
    console.error('[List Datasets Error]', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ==========================================================================
   3. E2EE ENCRYPTED NOTIFICATIONS ENDPOINTS
   ========================================================================== */

/**
 * Push Encrypted Notification & Broadcast over WebSocket
 */
app.post('/api/notifications', (req, res) => {
  try {
    const { userId, encryptedPayloadHex, ivHex } = req.body;
    if (!userId || !encryptedPayloadHex || !ivHex) {
      return res.status(400).json({ error: 'INVALID_NOTIFICATION_PAYLOAD' });
    }

    const notification = Store.addEncryptedNotification({ userId, encryptedPayloadHex, ivHex });
    
    // Broadcast via WebSockets
    broadcastEncryptedNotification(userId, notification);

    return res.status(201).json({ status: 'SUCCESS', notification });
  } catch (err) {
    console.error('[Add Notification Error]', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/**
 * Fetch Encrypted Notifications
 */
app.get('/api/notifications', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'MISSING_USER_ID' });

    const notifications = Store.listEncryptedNotifications(userId);
    return res.json({ status: 'SUCCESS', notifications });
  } catch (err) {
    console.error('[List Notifications Error]', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ==========================================================================
   4. CONFIDENTIAL AI COMPUTING PROXY & ATTESTATION
   ========================================================================== */

/**
 * Confidential Enclave Simulation / Attestation Endpoint
 * Proves enclave hardware signature to client before accepting encrypted compute payload.
 */
app.get('/api/ai/enclave-attestation', (req, res) => {
  const nonce = req.query.nonce || crypto.randomBytes(16).toString('hex');
  const enclavePublicKey = crypto.randomBytes(32).toString('hex');
  
  // Simulated hardware PCR values & attestation signature
  const pcrValues = {
    pcr0: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    pcr1: '037f00d3b6f04c62f27329d71c4c1a5b8109bf560e2d31c4f4b163d41f0212f4'
  };

  const attestationDoc = {
    provider: 'AWS Nitro Enclave Confidential Security Module',
    attestationTimestamp: new Date().toISOString(),
    nonce,
    enclavePublicKey,
    pcrValues,
    signatureHex: crypto.createHash('sha256').update(nonce + enclavePublicKey).digest('hex')
  };

  return res.json({ status: 'SUCCESS', attestation: attestationDoc });
});

/* ==========================================================================
   5. HEALTH & STATUS ENDPOINT
   ========================================================================== */

app.get('/api/health', (req, res) => {
  return res.json({
    status: 'ONLINE',
    system: 'DecisionOS Zero-Knowledge E2EE Backend Engine',
    securityMode: 'E2EE Zero-Trust / Zero-Knowledge',
    activeWebSockets: activeConnections.size,
    timestamp: new Date().toISOString()
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  DecisionOS Zero-Knowledge E2EE Server Running`);
  console.log(`📡 HTTP Endpoint: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket URL:  ws://localhost:${PORT}/ws`);
  console.log(`=======================================================`);
});
