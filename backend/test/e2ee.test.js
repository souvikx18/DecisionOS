import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Store } from '../src/store.js';

test('E2EE Zero-Knowledge Cryptographic & Backend Test Suite', async (t) => {

  await t.test('1. Zero-Knowledge User Registration & Login Challenge', () => {
    const emailBlind = crypto.createHash('sha256').update(`executive-${crypto.randomUUID()}@enterprise.com`).digest('hex');
    const saltHex = crypto.randomBytes(16).toString('hex');
    const publicKeyHex = crypto.randomBytes(65).toString('hex');
    const encryptedPrivateKeyHex = crypto.randomBytes(128).toString('hex');
    
    // Derived ZK Auth secret
    const zkAuthSecretHash = crypto.createHash('sha256').update('derived-master-key-bits').digest('hex');

    const user = Store.registerUser({
      emailBlind,
      saltHex,
      publicKeyHex,
      encryptedPrivateKeyHex,
      zkAuthSecretHash
    });

    assert.ok(user.id, 'User ID should be generated');
    assert.equal(user.emailBlind, emailBlind);

    // Test Login Challenge
    const { challengeId, challengeHex } = Store.createChallenge(emailBlind);
    assert.ok(challengeId);
    assert.ok(challengeHex);

    // Generate valid HMAC proof
    const validProof = crypto
      .createHmac('sha256', Buffer.from(zkAuthSecretHash, 'hex'))
      .update(Buffer.from(challengeHex, 'hex'))
      .digest('hex');

    const authResult = Store.verifyChallengeProof(challengeId, validProof);
    assert.ok(authResult.token, 'Should return valid auth token');
    assert.equal(authResult.userId, user.id);
  });

  await t.test('2. Encrypted Datasets Storage & Blind Indexing Retrieval', () => {
    const userId = crypto.randomUUID();
    const datasetTypeBlind = crypto.createHash('sha256').update('revenue_register').digest('hex');
    const ciphertextHex = crypto.randomBytes(256).toString('hex');
    const ivHex = crypto.randomBytes(12).toString('hex');

    const dataset = Store.addEncryptedDataset({
      userId,
      orgId: 'org-alpha',
      datasetTypeBlind,
      ciphertextHex,
      ivHex
    });

    assert.ok(dataset.id);
    assert.equal(dataset.ciphertextHex, ciphertextHex);

    // List by blind index
    const results = Store.listEncryptedDatasets({ userId, datasetTypeBlind });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, dataset.id);
  });

  await t.test('3. E2EE Notifications Push & Mark Read', () => {
    const userId = crypto.randomUUID();
    const encryptedPayloadHex = crypto.randomBytes(128).toString('hex');
    const ivHex = crypto.randomBytes(12).toString('hex');

    const notif = Store.addEncryptedNotification({ userId, encryptedPayloadHex, ivHex });
    assert.ok(notif.id);
    assert.equal(notif.isRead, false);

    const list = Store.listEncryptedNotifications(userId);
    assert.equal(list.length, 1);

    Store.markNotificationRead(notif.id, userId);
    const updatedList = Store.listEncryptedNotifications(userId);
    assert.equal(updatedList[0].isRead, true);
  });
});
