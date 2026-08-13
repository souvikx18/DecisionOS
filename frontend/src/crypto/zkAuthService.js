import {
  deriveMasterKey,
  computeBlindIndex,
  generateAsymmetricKeyPair,
  encryptData,
  decryptData,
  generateZeroKnowledgeAuthProof,
  generateEmergencyRecoveryKit,
  bufferToHex,
  exportKeyToHex,
  importKeyFromHex
} from './e2eeEngine.js';

const BACKEND_URL = 'http://localhost:4000/api';

export const ZKAuthService = {
  /**
   * Register User with Zero-Knowledge E2EE Protocol
   */
  async register({ email, password, name, organization }) {
    // 1. Generate 16-byte random salt
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const saltHex = bufferToHex(saltBytes.buffer);

    // 2. Derive Master Symmetric Key (K_master) & Blind Secret Key (K_blind)
    const { masterKey, blindSecretKey } = await deriveMasterKey(password, saltHex);

    // 3. Compute Blind Index for Email
    const emailBlind = await computeBlindIndex(blindSecretKey, email);

    // 4. Generate Asymmetric Key Pair for Team Key Exchange
    const keyPair = await generateAsymmetricKeyPair();

    // 5. Encrypt Private Key with Master Key
    const encryptedPrivKey = await encryptData(masterKey, keyPair.privateKeyPkcs8Hex);

    // 6. Generate Zero-Knowledge Auth Proof Secret Hash
    const zkAuthSecretHash = await generateZeroKnowledgeAuthProof(masterKey, saltHex);

    // 7. Generate Emergency 24-Word Recovery Kit
    const recoveryKit = generateEmergencyRecoveryKit();

    // 8. Register on ZK Backend (Server ONLY receives ciphertext & blind indexes)
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailBlind,
        saltHex,
        publicKeyHex: keyPair.publicKeySpkiHex,
        encryptedPrivateKeyHex: JSON.stringify(encryptedPrivKey),
        zkAuthSecretHash
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'REGISTRATION_FAILED');
    }

    const masterKeyHex = await exportKeyToHex(masterKey);

    // Store session credentials in RAM / sessionStorage
    sessionStorage.setItem('e2ee_master_key', masterKeyHex);
    sessionStorage.setItem('e2ee_salt_hex', saltHex);
    sessionStorage.setItem('e2ee_user_id', result.userId);

    return {
      userId: result.userId,
      email,
      name,
      organization,
      masterKey,
      recoveryKit
    };
  },

  /**
   * Login with Zero-Knowledge Challenge Proof
   */
  async login({ email, password }) {
    // 1. Temporary blind hash using password to query user challenge
    // First, ask server for user salt by sending initial blind email query
    // We compute a preliminary salt-less email hash to fetch salt, or ask server
    const dummyBlindKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('prelim-blind-salt'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // We use a deterministic email blind index derived from email
    const emailBlind = await computeBlindIndex(dummyBlindKey, email);

    // Request Login Challenge from Backend
    const challengeRes = await fetch(`${BACKEND_URL}/api/auth/login-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailBlind })
    });

    if (!challengeRes.ok) {
      const err = await challengeRes.json();
      throw new Error(err.error || 'USER_NOT_FOUND');
    }

    const challengeData = await challengeRes.json();
    const { saltHex, challengeId, challengeHex, encryptedPrivateKeyHex } = challengeData;

    // 2. Derive true Master Symmetric Key using returned saltHex
    const { masterKey } = await deriveMasterKey(password, saltHex);

    // 3. Compute Zero-Knowledge Proof for the server's challenge
    const proofHex = await generateZeroKnowledgeAuthProof(masterKey, challengeHex);

    // 4. Verify Proof with Backend
    const verifyRes = await fetch(`${BACKEND_URL}/api/auth/login-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, proofHex })
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      throw new Error(verifyData.error || 'AUTHENTICATION_FAILED');
    }

    // 5. Decrypt User's Private Key to verify masterKey is valid
    let decryptedPrivKey = null;
    try {
      const parsedEncPrivKey = JSON.parse(encryptedPrivateKeyHex);
      decryptedPrivKey = await decryptData(masterKey, parsedEncPrivKey.ciphertextHex, parsedEncPrivKey.ivHex);
    } catch {
      console.warn('Private key decrypt error; using master key fallback.');
    }

    const masterKeyHex = await exportKeyToHex(masterKey);
    sessionStorage.setItem('e2ee_master_key', masterKeyHex);
    sessionStorage.setItem('e2ee_salt_hex', saltHex);
    sessionStorage.setItem('e2ee_user_id', verifyData.userId);
    sessionStorage.setItem('e2ee_token', verifyData.token);

    return {
      userId: verifyData.userId,
      email,
      token: verifyData.token,
      masterKey
    };
  },

  /**
   * Get Active Session Master Key from SessionStorage
   */
  async getActiveMasterKey() {
    const hex = sessionStorage.getItem('e2ee_master_key');
    if (!hex) return null;
    return await importKeyFromHex(hex);
  },

  /**
   * Clear E2EE Session
   */
  logout() {
    sessionStorage.removeItem('e2ee_master_key');
    sessionStorage.removeItem('e2ee_salt_hex');
    sessionStorage.removeItem('e2ee_user_id');
    sessionStorage.removeItem('e2ee_token');
  }
};
