// test/realtime.test.js
// ============================================================
// Real-Time WebSockets & Multi-Tenant Event Broadcasting Test Suite
// ============================================================

import 'dotenv/config';
import http from 'node:http';
import { WebSocket } from 'ws';
import app from '../src/app.js';
import { initRealtime, closeRealtime, broadcastToOrg, sendToUser } from '../src/lib/realtime.js';
import { prisma } from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/crypto.js';

async function testRealtimeSuite() {
  const pass = [];
  const fail = [];

  function check(name, condition, actual) {
    if (condition) {
      pass.push(name);
      console.log('  ✅ PASS: ' + name);
    } else {
      fail.push(name);
      console.error('  ❌ FAIL: ' + name + ' -> ' + JSON.stringify(actual));
    }
  }

  console.log('\n======================================================');
  console.log('⚡ TESTING REAL-TIME WEBSOCKETS & EVENT BROADCASTING');
  console.log('======================================================\n');

  const server = http.createServer(app);
  const TEST_PORT = 4129;
  let wsServer = null;

  try {
    // 1. Setup test user & organization
    const orgId1 = 'ws_org_' + Date.now();
    const orgId2 = 'ws_org2_' + Date.now();
    const userId1 = 'ws_user_' + Date.now();
    const userId2 = 'ws_user2_' + Date.now();
    const token1 = generateToken(32);
    const token2 = generateToken(32);

    const user1 = await prisma.user.create({
      data: {
        id: userId1,
        email: `ws_${Date.now()}@decisionos.com`,
        firstName: 'WS',
        lastName: 'Tester',
        passwordHash: 'dummy_hash',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        id: userId2,
        email: `ws2_${Date.now()}@decisionos.com`,
        firstName: 'WS2',
        lastName: 'Tester2',
        passwordHash: 'dummy_hash',
      },
    });

    const org1 = await prisma.organization.create({
      data: {
        id: orgId1,
        name: 'WS Org 1',
        slug: `ws-org-1-${Date.now()}`,
      },
    });

    const org2 = await prisma.organization.create({
      data: {
        id: orgId2,
        name: 'WS Org 2',
        slug: `ws-org-2-${Date.now()}`,
      },
    });

    await prisma.organizationMember.create({
      data: { organizationId: org1.id, userId: user1.id, role: 'OWNER' },
    });

    await prisma.organizationMember.create({
      data: { organizationId: org2.id, userId: user2.id, role: 'OWNER' },
    });

    await prisma.session.create({
      data: {
        userId: user1.id,
        token: token1,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    await prisma.session.create({
      data: {
        userId: user2.id,
        token: token2,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    // 2. Start HTTP & Realtime server
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    wsServer = initRealtime(server);
    check('Realtime server initialized on /ws', Boolean(wsServer));

    // 3. Connect Client 1 (Org 1) and wait for CONNECTED greeting
    const messagesClient1 = [];
    const ws1 = new WebSocket(`ws://localhost:${TEST_PORT}/ws?token=${token1}`);

    await new Promise((resolve) => {
      ws1.on('message', (msg) => {
        const payload = JSON.parse(msg.toString());
        messagesClient1.push(payload);
        if (payload.type === 'CONNECTED') resolve();
      });
    });

    check('Client 1 WebSocket connection established', ws1.readyState === WebSocket.OPEN);
    check('Client 1 received CONNECTED confirmation', messagesClient1.some((m) => m.type === 'CONNECTED'));

    // 4. Connect Client 2 (Org 2) and wait for CONNECTED greeting
    const messagesClient2 = [];
    const ws2 = new WebSocket(`ws://localhost:${TEST_PORT}/ws?token=${token2}`);

    await new Promise((resolve) => {
      ws2.on('message', (msg) => {
        const payload = JSON.parse(msg.toString());
        messagesClient2.push(payload);
        if (payload.type === 'CONNECTED') resolve();
      });
    });

    check('Client 2 WebSocket connection established', ws2.readyState === WebSocket.OPEN);
    check('Client 2 received CONNECTED confirmation', messagesClient2.some((m) => m.type === 'CONNECTED'));

    // 5. Test Multi-Tenant Broadcast to Org 1
    broadcastToOrg(org1.id, 'REPORT_READY', { reportId: 'rep_123', title: 'Q3 Financials' });
    await new Promise((r) => setTimeout(r, 200));

    const client1GotReport = messagesClient1.some((m) => m.type === 'REPORT_READY' && m.data.reportId === 'rep_123');
    const client2GotReport = messagesClient2.some((m) => m.type === 'REPORT_READY');

    check('Client 1 (Org 1) received REPORT_READY broadcast', client1GotReport);
    check('Client 2 (Org 2) did NOT receive Org 1 event (Strict Isolation)', !client2GotReport);

    // 6. Test Direct User message to User 2
    sendToUser(user2.id, 'STOCK_ALERT', { sku: 'SKU-999', message: 'Item low' });
    await new Promise((r) => setTimeout(r, 200));

    const client2GotStock = messagesClient2.some((m) => m.type === 'STOCK_ALERT' && m.data.sku === 'SKU-999');
    const client1GotStock = messagesClient1.some((m) => m.type === 'STOCK_ALERT');

    check('Client 2 received direct user STOCK_ALERT', client2GotStock);
    check('Client 1 did NOT receive Client 2 direct message', !client1GotStock);

    // 7. Cleanup
    ws1.close();
    ws2.close();
    await closeRealtime();
    await new Promise((resolve) => server.close(resolve));

    // Cleanup DB records
    await prisma.session.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: [org1.id, org2.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org1.id, org2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });

    console.log('\n======================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${pass.length} passed, ${fail.length} failed`);
    console.log('======================================================\n');

    process.exit(fail.length > 0 ? 1 : 0);

  } catch (err) {
    console.error('❌ Realtime test crashed:', err);
    if (wsServer) await closeRealtime();
    server.close();
    process.exit(1);
  }
}

testRealtimeSuite();
