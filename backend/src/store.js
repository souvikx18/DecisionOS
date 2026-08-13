import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Zero-Knowledge JSON/File DB Store
 * Stores ciphertext blobs, blind indexes, SRP salts, and encrypted public/private key pairs.
 * Plaintext data NEVER touches this store!
 */

const DB_FILE = path.join(process.cwd(), 'data', 'zk_store.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

let db = {
  users: {},         // emailBlind -> user record
  sessions: {},      // token -> session info
  datasets: [],      // array of encrypted dataset blobs
  notifications: []  // array of encrypted notification payloads
};

// Load existing store if available
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(raw);
    console.log(`[ZK Store] Loaded ${Object.keys(db.users).length} users, ${db.datasets.length} encrypted datasets.`);
  } catch (err) {
    console.error('[ZK Store] Error reading database file:', err);
  }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export const Store = {
  // User Management
  registerUser({ emailBlind, saltHex, publicKeyHex, encryptedPrivateKeyHex, zkAuthSecretHash }) {
    if (db.users[emailBlind]) {
      throw new Error('USER_ALREADY_EXISTS');
    }
    const user = {
      id: crypto.randomUUID(),
      emailBlind,
      saltHex,
      publicKeyHex,
      encryptedPrivateKeyHex,
      zkAuthSecretHash,
      createdAt: new Date().toISOString()
    };
    db.users[emailBlind] = user;
    saveDB();
    return user;
  },

  getUserByBlindEmail(emailBlind) {
    return db.users[emailBlind] || null;
  },

  // Session Management
  createChallenge(emailBlind) {
    const challengeHex = crypto.randomBytes(32).toString('hex');
    const challengeId = crypto.randomUUID();
    db.sessions[challengeId] = {
      emailBlind,
      challengeHex,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 mins
    };
    saveDB();
    return { challengeId, challengeHex };
  },

  verifyChallengeProof(challengeId, proofHex) {
    const session = db.sessions[challengeId];
    if (!session || Date.now() > session.expiresAt) {
      throw new Error('CHALLENGE_EXPIRED');
    }
    const user = db.users[session.emailBlind];
    if (!user) throw new Error('USER_NOT_FOUND');

    // Verify HMAC-SHA256(zkAuthSecretHash, challengeHex)
    const expectedProof = crypto
      .createHmac('sha256', Buffer.from(user.zkAuthSecretHash, 'hex'))
      .update(Buffer.from(session.challengeHex, 'hex'))
      .digest('hex');

    delete db.sessions[challengeId];
    saveDB();

    if (expectedProof !== proofHex) {
      throw new Error('ZERO_KNOWLEDGE_PROOF_INVALID');
    }

    // Issue auth token
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = {
      userId: user.id,
      emailBlind: user.emailBlind,
      createdAt: Date.now()
    };
    saveDB();

    return { token, userId: user.id, user };
  },

  // E2EE Datasets Storage
  addEncryptedDataset({ userId, orgId, datasetTypeBlind, ciphertextHex, ivHex }) {
    const item = {
      id: crypto.randomUUID(),
      userId,
      orgId,
      datasetTypeBlind,
      ciphertextHex,
      ivHex,
      createdAt: new Date().toISOString()
    };
    db.datasets.push(item);
    saveDB();
    return item;
  },

  listEncryptedDatasets({ userId, datasetTypeBlind }) {
    return db.datasets.filter(d => {
      if (d.userId !== userId) return false;
      if (datasetTypeBlind && d.datasetTypeBlind !== datasetTypeBlind) return false;
      return true;
    });
  },

  // E2EE Notifications Storage
  addEncryptedNotification({ userId, encryptedPayloadHex, ivHex }) {
    const notif = {
      id: crypto.randomUUID(),
      userId,
      encryptedPayloadHex,
      ivHex,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.push(notif);
    saveDB();
    return notif;
  },

  listEncryptedNotifications(userId) {
    return db.notifications.filter(n => n.userId === userId);
  },

  markNotificationRead(id, userId) {
    const target = db.notifications.find(n => n.id === id && n.userId === userId);
    if (target) {
      target.isRead = true;
      saveDB();
    }
    return target;
  }
};
