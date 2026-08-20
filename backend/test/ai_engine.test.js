// test/ai_engine.test.js
// ============================================================
// DecisionOS AI Engine Automated Integration Test Suite
// Tests: Gemini 1.5 Flash Analytics, Anomaly Detection,
// Forecasting, Ask DecisionOS, Insights Summary & Filtering
// ============================================================

import { prisma } from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/crypto.js';

async function testAiEngine() {
  const BASE = 'http://localhost:3001/api/v1';
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
  console.log('🚀 TESTING DECISIONOS AI ENGINE & ANOMALY DETECTION');
  console.log('======================================================\n');

  // 1. Setup Test User, Org, and Session in DB
  const testEmail = 'ai_test_' + Date.now() + '@decisionos.com';
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      firstName: 'Intelligence',
      lastName: 'Officer',
      passwordHash: 'argon2_mock_hash',
      isEmailVerified: true,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'Apex Industrial ' + Date.now(),
      slug: 'apex-ind-' + Date.now(),
      status: 'ACTIVE',
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'ADMIN',
    },
  });

  const sessionToken = generateToken(32);
  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const cookie = 'session=' + sessionToken;
  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookie,
    Authorization: 'Bearer ' + sessionToken,
    'X-Organization-ID': org.id,
  };

  async function api(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  }

  // ── 2. Seed Test Scenario Data (Anomalies, Spikes & Depletions) ──
  console.log('🌱 Seeding scenario data for AI Anomaly Detection...');

  // A. Customer with high spend + long dormancy (> 50 days)
  const dormantCustomer = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: 'Bharat Petroleum Corp',
      email: 'procurement@bharatpetro.in',
      company: 'BPCL',
      segment: 'Enterprise',
      totalRevenue: 285000,
      lastOrderAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), // 55 days ago
      churnRisk: 0.75,
    },
  });

  // B. Product with fast sales velocity
  const productA = await prisma.product.create({
    data: {
      organizationId: org.id,
      name: 'Hydraulic Oil 68L',
      sku: 'OIL-HYD-68L',
      costPrice: 850,
      sellingPrice: 1400,
    },
  });

  // C. Inventory Item critically low (8 units on hand, reorder: 50)
  const inventoryLow = await prisma.inventoryItem.create({
    data: {
      organizationId: org.id,
      productId: productA.id,
      name: 'Hydraulic Oil 68L Drum',
      sku: 'OIL-HYD-68L',
      quantity: 8,
      reorderLevel: 50,
      reorderQty: 100,
      warehouseLocation: 'Zone A - Bay 4',
    },
  });

  // D. Seed Sales over last 30 days
  for (let i = 0; i < 5; i++) {
    await prisma.sale.create({
      data: {
        organizationId: org.id,
        customerId: dormantCustomer.id,
        productId: productA.id,
        quantity: 10,
        unitPrice: 1400,
        totalAmount: 14000,
        soldAt: new Date(Date.now() - i * 4 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // E. Seed Expense Spike in Logistics (> ₹35,000 this month vs ₹10,000 prev month)
  const now = new Date();
  await prisma.expense.create({
    data: {
      organizationId: org.id,
      category: 'Logistics',
      subCategory: 'Express Freight',
      amount: 42000,
      vendor: 'BlueDart Express',
      description: 'Emergency air charter transport',
      occurredAt: new Date(now.getFullYear(), now.getMonth(), 5),
    },
  });

  await prisma.expense.create({
    data: {
      organizationId: org.id,
      category: 'Logistics',
      amount: 12000,
      vendor: 'Gati Cargo',
      description: 'Ground freight',
      occurredAt: new Date(now.getFullYear(), now.getMonth() - 1, 15), // prev month
    },
  });

  // ── T1: Trigger Full AI Insights Generation ──────────────────
  const genRes = await api('POST', '/ai/generate');
  check('T1: Trigger AI Insights Generation (201)', genRes.status === 201 && genRes.body.data?.insightsCount >= 2, genRes);

  // ── T2: Verify Detected Inventory Stockout Anomaly ───────────
  const stockoutInsight = genRes.body.data?.insights?.find((i) => i.type === 'inventory');
  check('T2: Detected Inventory Stockout Anomaly', Boolean(stockoutInsight && stockoutInsight.severity === 'critical'), stockoutInsight);

  // ── T3: Verify Detected Expense Spike Anomaly ────────────────
  const expenseInsight = genRes.body.data?.insights?.find((i) => i.type === 'expense');
  check('T3: Detected Category Expense Spike (Logistics)', Boolean(expenseInsight && expenseInsight.title.includes('Logistics')), expenseInsight);

  // ── T4: Verify Detected Customer Churn Inactivity ────────────
  const churnInsight = genRes.body.data?.insights?.find((i) => i.type === 'churn');
  check('T4: Detected High-Value Customer Churn Risk', Boolean(churnInsight && churnInsight.title.includes('Bharat Petroleum')), churnInsight);

  // ── T5: Insights Summary & Health Score ──────────────────────
  const summaryRes = await api('GET', '/ai/insights/summary');
  check('T5: Executive Insights Summary & Health Score (200)', summaryRes.status === 200 && summaryRes.body.data?.healthScore > 0, summaryRes.body.data);

  // ── T6: Filter Insights by Severity (critical) ───────────────
  const critRes = await api('GET', '/ai/insights?severity=critical');
  check('T6: Filter Insights by Severity (critical)', critRes.status === 200 && critRes.body.data?.every((i) => i.severity === 'critical'), critRes.body.data);

  // ── T7: Filter Insights by Type (inventory) ──────────────────
  const invRes = await api('GET', '/ai/insights?type=inventory');
  check('T7: Filter Insights by Type (inventory)', invRes.status === 200 && invRes.body.data?.every((i) => i.type === 'inventory'), invRes.body.data);

  // ── T8: Mark Insight as Read ─────────────────────────────────
  const insightId = genRes.body.data?.insights[0]?.id;
  const readRes = await api('PATCH', `/ai/insights/${insightId}/read`);
  check('T8: Mark Insight as Read (200)', readRes.status === 200 && readRes.body.data?.isRead === true, readRes);

  // ── T9: Dismiss Insight ──────────────────────────────────────
  const dismissRes = await api('PATCH', `/ai/insights/${insightId}/dismiss`);
  check('T9: Dismiss Insight (200)', dismissRes.status === 200 && dismissRes.body.data?.isDismissed === true, dismissRes);

  // Verify dismissed insight is excluded from active list
  const activeList = await api('GET', '/ai/insights');
  check('T9b: Dismissed Insight excluded from active list', !activeList.body.data?.some((i) => i.id === insightId), activeList.body.data);

  // ── T10: Ask DecisionOS Natural Language Query ────────────────
  const askRes = await api('POST', '/ai/ask', {
    query: 'What is our total revenue and what is our biggest expense this month?',
  });
  check('T10: Ask DecisionOS Natural Language Query (200)', askRes.status === 200 && askRes.body.data?.answer?.length > 10, askRes.body.data);
  check('T10b: Key metrics returned in answer', Boolean(askRes.body.data?.keyMetrics), askRes.body.data?.keyMetrics);

  // ── T11: Predictive Revenue Forecast ─────────────────────────
  const forecastRes = await api('GET', '/ai/forecast/revenue?months=3');
  check('T11: 3-Month Predictive Revenue Forecast (200)', forecastRes.status === 200 && forecastRes.body.data?.forecast?.some((f) => f.type === 'predicted'), forecastRes.body.data);

  // ── T12: AI Usage Stats & Quota Tracking ─────────────────────
  const usageRes = await api('GET', '/ai/usage');
  check('T12: Monthly AI Usage Stats & Quota Limits (200)', usageRes.status === 200 && usageRes.body.data?.maxCallsAllowed >= 5, usageRes.body.data);

  console.log('\n======================================================');
  console.log('🏁 AI ENGINE TEST RESULTS: ' + pass.length + ' PASSED | ' + fail.length + ' FAILED');
  console.log('======================================================\n');

  process.exit(fail.length > 0 ? 1 : 0);
}

testAiEngine().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
