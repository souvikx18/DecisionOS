/**
 * DecisionOS Zero-Knowledge End-to-End Encryption (E2EE) Engine
 * Powered by Web Crypto API (AES-256-GCM, PBKDF2-HMAC-SHA256, ECDH/P-256, HMAC-SHA256 Blind Indexing)
 * 
 * Guarantees zero-knowledge privacy: data is encrypted in client RAM before hitting backend/network.
 */

// Helper: Convert ArrayBuffer to Hex String
export function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert Hex String to ArrayBuffer
export function hexToBuffer(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

// Helper: Text Encoder & Decoder
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * 1. Derives Master Symmetric Key (K_master) from User Password & Salt using PBKDF2 (100,000 iterations)
 */
export async function deriveMasterKey(password, saltHex) {
  const salt = hexToBuffer(saltHex);
  const passwordBuffer = encoder.encode(password);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  const masterKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // Extractable for local RAM storage / key export
    ['encrypt', 'decrypt']
  );

  // Derive Blind Index Secret Key (K_blind)
  const blindKeyBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`blind-salt-${saltHex}`),
      iterations: 50000,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );

  const blindSecretKey = await window.crypto.subtle.importKey(
    'raw',
    blindKeyBits,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return { masterKey, blindSecretKey };
}

/**
 * 2. Export CryptoKey to Raw Hex
 */
export async function exportKeyToHex(cryptoKey) {
  const raw = await window.crypto.subtle.exportKey('raw', cryptoKey);
  return bufferToHex(raw);
}

/**
 * 3. Import CryptoKey from Raw Hex
 */
export async function importKeyFromHex(hexString, usage = ['encrypt', 'decrypt']) {
  const buffer = hexToBuffer(hexString);
  return await window.crypto.subtle.importKey(
    'raw',
    buffer,
    { name: 'AES-GCM', length: 256 },
    true,
    usage
  );
}

/**
 * 4. Generate Asymmetric Key Pair (ECDH P-256) for Multi-User Key Exchange & Organization Key Wrapping
 */
export async function generateAsymmetricKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  const pubExport = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privExport = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeySpkiHex: bufferToHex(pubExport),
    privateKeyPkcs8Hex: bufferToHex(privExport)
  };
}

/**
 * 5. Compute HMAC-SHA256 Blind Index for Exact Server Search without Decryption
 */
export async function computeBlindIndex(blindSecretKey, value) {
  if (!value) return '';
  const normalizedValue = String(value).trim().toLowerCase();
  const signature = await window.crypto.subtle.sign(
    'HMAC',
    blindSecretKey,
    encoder.encode(normalizedValue)
  );
  return bufferToHex(signature);
}

/**
 * 6. Symmetric AES-256-GCM Encryption
 * Payload can be object, array, string, or ArrayBuffer
 */
export async function encryptData(key, data) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit GCM IV
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  const encodedData = encoder.encode(jsonString);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedData
  );

  return {
    ciphertextHex: bufferToHex(ciphertextBuffer),
    ivHex: bufferToHex(iv.buffer)
  };
}

/**
 * 7. Symmetric AES-256-GCM Decryption
 */
export async function decryptData(key, ciphertextHex, ivHex) {
  try {
    const ciphertextBuffer = hexToBuffer(ciphertextHex);
    const iv = hexToBuffer(ivHex);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv)
      },
      key,
      ciphertextBuffer
    );

    const decodedText = decoder.decode(decryptedBuffer);
    try {
      return JSON.parse(decodedText);
    } catch {
      return decodedText;
    }
  } catch (err) {
    console.error('Decryption failed! Ciphertext tampered or key invalid.', err);
    throw new Error('E2EE_DECRYPT_FAILED');
  }
}

/**
 * 8. Zero-Knowledge Authentication Token Generation (HMAC Auth Challenge)
 */
export async function generateZeroKnowledgeAuthProof(masterKey, challengeHex) {
  const challengeBuffer = hexToBuffer(challengeHex);
  const rawMasterKey = await window.crypto.subtle.exportKey('raw', masterKey);

  const hmacKey = await window.crypto.subtle.importKey(
    'raw',
    rawMasterKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', hmacKey, challengeBuffer);
  return bufferToHex(signature);
}

/**
 * 9. Generate Emergency 24-Word Mnemonic Recovery Kit
 */
export function generateEmergencyRecoveryKit() {
  const words = [
    'obsidian', 'shield', 'vault', 'matrix', 'cipher', 'quantum', 'beacon', 'sentinel',
    'horizon', 'nebula', 'titan', 'apex', 'vortex', 'cascade', 'zenith', 'solaris',
    'strata', 'echo', 'prism', 'valkyrie', 'pulsar', 'fortress', 'aurora', 'catalyst'
  ];
  // Shuffle randomly for demonstration of 24-word seed phrase
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(24));
  const recoveryPhrase = Array.from(randomBytes).map((b, i) => `${i + 1}-${words[b % words.length]}`).join(' ');
  const recoveryHash = bufferToHex(randomBytes.buffer);
  
  return { recoveryPhrase, recoveryHash };
}
