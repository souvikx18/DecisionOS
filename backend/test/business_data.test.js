// test/business_data.test.js
// ============================================================
// Comprehensive Business Data Test Suite
// Tests all 6 modules: Customers, Products, Sales, Expenses, Inventory, Analytics
// ============================================================

import { prisma } from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/crypto.js';

async function testBusinessData() {
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
  console.log('🚀 TESTING BUSINESS DATA MODULE (ALL 6 SUB-MODULES)');
  console.log('======================================================\n');

  // 1. Setup Test User, Org, Member, and Session in DB
  const testEmail = 'biztest_' + Date.now() + '@decisionos.com';
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      firstName: 'Business',
      lastName: 'Analyst',
      passwordHash: 'argon2id_mock_hash',
      isEmailVerified: true,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'Acme Enterprises ' + Date.now(),
      slug: 'acme-ent-' + Date.now(),
      status: 'ACTIVE',
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'ANALYST',
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
    'Cookie': cookie,
    'Authorization': 'Bearer ' + sessionToken,
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

  // T1: Unauthenticated request should return 401
  const unauth = await fetch(BASE + '/customers').then((r) => ({ status: r.status }));
  check('T1: Unauthenticated request blocked (401)', unauth.status === 401, unauth.status);

  // T2: Create Customer
  const custRes = await api('POST', '/customers', {
    name: 'Reliance Retail',
    email: 'contact@reliance.com',
    company: 'Reliance Industries',
    segment: 'Enterprise',
    region: 'North',
    churnRisk: 0.15,
  });
  check('T2: Create Customer (201)', custRes.status === 201 && custRes.body.data?.name === 'Reliance Retail', custRes);
  const customerId = custRes.body.data?.id;

  // T3: List Customers
  const listCustRes = await api('GET', '/customers?segment=Enterprise');
  check('T3: List Customers with filter (200)', listCustRes.status === 200 && listCustRes.body.data?.length >= 1, listCustRes);

  // T4: Customer Metrics
  const custMetrics = await api('GET', '/customers/summary/metrics');
  check('T4: Customer Metrics (200)', custMetrics.status === 200 && custMetrics.body.data?.totalCustomers >= 1, custMetrics);

  // T5: Create Product
  const prodRes = await api('POST', '/products', {
    name: 'Industrial Widget A',
    sku: 'WIDGET-001',
    category: 'Hardware',
    costPrice: 450,
    sellingPrice: 750,
    unit: 'pcs',
  });
  check('T5: Create Product (201)', prodRes.status === 201 && prodRes.body.data?.sku === 'WIDGET-001', prodRes);
  const productId = prodRes.body.data?.id;

  // T6: Duplicate SKU Conflict (409)
  const dupSkuRes = await api('POST', '/products', {
    name: 'Industrial Widget Copy',
    sku: 'WIDGET-001',
    costPrice: 400,
    sellingPrice: 700,
  });
  check('T6: Duplicate SKU rejected (409)', dupSkuRes.status === 409, dupSkuRes.status);

  // T7: Product Categories
  const catRes = await api('GET', '/products/categories/list');
  check('T7: Product Categories List (200)', catRes.status === 200 && catRes.body.data?.categories?.includes('Hardware'), catRes);

  // T8: Create Inventory Item
  const invRes = await api('POST', '/inventory', {
    productId,
    name: 'Warehouse Widget A Stock',
    sku: 'WIDGET-001',
    quantity: 100,
    reorderLevel: 25,
    reorderQty: 50,
    warehouseLocation: 'Zone B, Shelf 4',
  });
  check('T8: Create Inventory Item (201)', invRes.status === 201 && invRes.body.data?.quantity === 100, invRes);
  const inventoryId = invRes.body.data?.id;

  // T9: Adjust Inventory Stock (+20)
  const adjRes = await api('POST', '/inventory/' + inventoryId + '/adjust', {
    adjustment: 20,
    reason: 'Incoming supplier shipment',
  });
  check('T9: Adjust Stock (200 - new qty 120)', adjRes.status === 200 && adjRes.body.data?.quantity === 120, adjRes);

  // T10: Inventory Alerts Summary
  const invAlerts = await api('GET', '/inventory/summary/alerts');
  check('T10: Inventory Alerts Summary (200)', invAlerts.status === 200 && invAlerts.body.data?.totalUnits >= 120, invAlerts);

  // T11: Record Sale (Atomic: decrements inventory, updates customer totalRevenue)
  const saleRes = await api('POST', '/sales', {
    customerId,
    productId,
    quantity: 10,
    unitPrice: 750,
    discount: 500,
    channel: 'Direct Wholesale',
    region: 'North',
    decrementInventory: true,
  });
  // TotalAmount = (10 * 750) - 500 = 7000
  check('T11: Record Sale (201 - Total 7000)', saleRes.status === 201 && Number(saleRes.body.data?.totalAmount) === 7000, saleRes);

  // T12: Verify Customer Revenue Updated
  const updatedCust = await api('GET', '/customers/' + customerId);
  check('T12: Customer totalRevenue auto-synced to 7000', Number(updatedCust.body.data?.totalRevenue) === 7000, updatedCust);

  // T13: Verify Inventory Decremented (120 - 10 = 110)
  const updatedInv = await api('GET', '/inventory/' + inventoryId);
  check('T13: Inventory auto-decremented to 110', updatedInv.body.data?.quantity === 110, updatedInv);

  // T14: Sales Trends Summary
  const trendsRes = await api('GET', '/sales/summary/trends');
  check('T14: Sales Trends Aggregation (200)', trendsRes.status === 200 && trendsRes.body.data?.totalRevenue >= 7000, trendsRes);

  // T15: Record Expense
  const expRes = await api('POST', '/expenses', {
    category: 'Logistics',
    subCategory: 'Freight',
    amount: 1800,
    vendor: 'BlueDart Express',
    description: 'Shipping charges for Widget A orders',
  });
  check('T15: Record Expense (201)', expRes.status === 201 && expRes.body.data?.category === 'Logistics', expRes);

  // T16: Expense Breakdown Summary
  const expBreakdown = await api('GET', '/expenses/summary/breakdown');
  check('T16: Expense Breakdown by Category (200)', expBreakdown.status === 200 && expBreakdown.body.data?.totalExpenses >= 1800, expBreakdown);

  // T17: Executive Analytics Dashboard KPIs
  const analyticsSummary = await api('GET', '/analytics/summary');
  check('T17: Executive Analytics Summary (200)', analyticsSummary.status === 200 && analyticsSummary.body.data?.kpis?.totalRevenue?.value >= 7000, analyticsSummary);

  // T18: Revenue Trend Chart Payload
  const trendChart = await api('GET', '/analytics/charts/revenue-trend?months=6');
  check('T18: Revenue Trend Chart (200 - 6 months)', trendChart.status === 200 && trendChart.body.data?.trend?.length === 6, trendChart);

  // T19: Expense Breakdown Chart Payload
  const expChart = await api('GET', '/analytics/charts/expense-breakdown');
  check('T19: Expense Breakdown Chart (200)', expChart.status === 200 && expChart.body.data?.categories?.length >= 1, expChart);

  console.log('\n======================================================');
  console.log('🏁 TEST RESULTS: ' + pass.length + ' PASSED | ' + fail.length + ' FAILED');
  console.log('======================================================\n');

  process.exit(fail.length > 0 ? 1 : 0);
}

testBusinessData().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
