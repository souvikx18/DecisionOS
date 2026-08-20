// test/reports.test.js
// ============================================================
// DecisionOS Automated Report Generation Integration Test Suite
// Tests: On-Demand Reports, Download URLs, Schedule CRUD,
// Status Transitions, Multi-Org Isolation
// ============================================================

import 'dotenv/config';
import { prisma }        from '../src/lib/prisma.js';
import { generateToken } from '../src/lib/crypto.js';

async function testReportGeneration() {
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
  console.log('📊 TESTING DECISIONOS AUTOMATED REPORT GENERATION');
  console.log('======================================================\n');

  // ─── 1. Setup — Org A (primary test org) ───────────────────
  const testEmail  = 'report_test_' + Date.now() + '@decisionos.com';
  const testEmail2 = 'report_test2_' + Date.now() + '@decisionos.com';

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      firstName: 'Report',
      lastName: 'Tester',
      passwordHash: 'argon2_mock_hash',
      isEmailVerified: true,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'Meridian Logistics ' + Date.now(),
      slug: 'meridian-' + Date.now(),
      status: 'ACTIVE',
      industry: 'Logistics',
    },
  });

  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'ADMIN' },
  });

  const sessionToken = generateToken(32);
  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const cookie  = 'session=' + sessionToken;
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
    const text = await res.text();
    let resBody = null;
    try {
      resBody = text ? JSON.parse(text) : null;
    } catch {
      resBody = text;
    }
    return { status: res.status, body: resBody };
  }

  // ─── 2. Setup — Org B (isolation test org) ─────────────────
  const userB = await prisma.user.create({
    data: {
      email: testEmail2,
      firstName: 'Other',
      lastName: 'Org',
      passwordHash: 'argon2_mock_hash',
      isEmailVerified: true,
    },
  });

  const orgB = await prisma.organization.create({
    data: {
      name: 'Rival Corp ' + Date.now(),
      slug: 'rival-' + Date.now(),
      status: 'ACTIVE',
    },
  });

  await prisma.organizationMember.create({
    data: { organizationId: orgB.id, userId: userB.id, role: 'ADMIN' },
  });

  const tokenB = generateToken(32);
  await prisma.session.create({
    data: {
      userId: userB.id,
      token: tokenB,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Org B API helper
  const headersB = {
    'Content-Type': 'application/json',
    Cookie: 'session=' + tokenB,
    Authorization: 'Bearer ' + tokenB,
    'X-Organization-ID': orgB.id,
  };
  async function apiB(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: headersB,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let resBody = null;
    try {
      resBody = text ? JSON.parse(text) : null;
    } catch {
      resBody = text;
    }
    return { status: res.status, body: resBody };
  }

  // ─── 3. Seed Business Data for Org A ───────────────────────
  console.log('🌱 Seeding business data for report generation...');

  const product = await prisma.product.create({
    data: {
      organizationId: org.id,
      name: 'Industrial Pump X500',
      sku: 'PUMP-X500-' + Date.now(),
      costPrice: 12000,
      sellingPrice: 18500,
      category: 'Machinery',
    },
  });

  const customer = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: 'Rajesh Mehta',
      email: 'rajesh@mehta-industries.in',
      company: 'Mehta Industries',
      segment: 'Enterprise',
      totalRevenue: 55500,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      organizationId: org.id,
      productId: product.id,
      name: 'Industrial Pump X500',
      sku: 'PUMP-X500-' + Date.now(),
      quantity: 12,
      reorderLevel: 5,
      reorderQty: 20,
    },
  });

  // Seed sales for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  for (let i = 0; i < 3; i++) {
    await prisma.sale.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        customerId: customer.id,
        quantity: 1 + i,
        unitPrice: 18500,
        totalAmount: 18500 * (1 + i),
        soldAt: new Date(thirtyDaysAgo.getTime() + i * 5 * 24 * 60 * 60 * 1000),
      },
    });
  }

  await prisma.expense.create({
    data: {
      organizationId: org.id,
      category: 'Logistics',
      amount: 25000,
      description: 'Freight charges Q3',
      occurredAt: new Date(thirtyDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Seed data ready\n');

  // ─── TEST: T1 — List Reports (empty initially) ───────────────
  console.log('📋 T1: List Reports (initially empty)');
  const t1 = await api('GET', '/reports');
  check('T1: GET /reports → 200', t1.status === 200, t1.body);
  check('T1: Returns reports array', Array.isArray(t1.body.data), t1.body);

  // ─── TEST: T2 — Generate On-Demand Daily Summary ─────────────
  console.log('\n📋 T2: Generate On-Demand Daily Summary Report (PDF + CSV)');
  const periodStart = new Date(thirtyDaysAgo).toISOString();
  const periodEnd   = new Date().toISOString();

  const t2 = await api('POST', '/reports/generate', {
    type: 'DAILY_SUMMARY',
    periodStart,
    periodEnd,
    formats: ['PDF', 'CSV'],
    emailTo: [],
  });
  check('T2: POST /reports/generate → 201', t2.status === 201, t2.body);
  check('T2: Report has id',    Boolean(t2.body.data?.id), t2.body.data);
  check('T2: Report status is READY', t2.body.data?.status === 'READY', t2.body.data?.status);
  check('T2: Report type = DAILY_SUMMARY', t2.body.data?.type === 'DAILY_SUMMARY', t2.body.data?.type);
  check('T2: Has exports array', Array.isArray(t2.body.data?.exports), t2.body.data);

  const reportId = t2.body.data?.id;

  // ─── TEST: T3 — Status Transition: PENDING → READY ───────────
  console.log('\n📋 T3: Report status transitions correctly');
  const t3 = await api('GET', '/reports/' + reportId);
  check('T3: GET /reports/:id → 200', t3.status === 200, t3.body);
  check('T3: Status is READY', t3.body.data?.status === 'READY', t3.body.data?.status);
  check('T3: Includes exports', Array.isArray(t3.body.data?.exports), t3.body.data?.exports);

  // ─── TEST: T4 — Signed Download URL for PDF Export ───────────
  console.log('\n📋 T4: Get Signed Download URL for PDF export');
  const pdfExport = t2.body.data?.exports?.find((e) => e.format === 'PDF');
  if (pdfExport) {
    const t4 = await api('GET', `/reports/${reportId}/download/${pdfExport.id}`);
    check('T4: GET /download/:exportId → 200', t4.status === 200, t4.body);
    check('T4: Returns signedUrl string', typeof t4.body.data?.signedUrl === 'string', t4.body.data);
    check('T4: Format is PDF', t4.body.data?.format === 'PDF', t4.body.data?.format);
  } else {
    check('T4: PDF export exists', false, 'No PDF export found in report');
  }

  // ─── TEST: T5 — Signed Download URL for CSV Export ───────────
  console.log('\n📋 T5: Get Signed Download URL for CSV export');
  const csvExport = t2.body.data?.exports?.find((e) => e.format === 'CSV');
  if (csvExport) {
    const t5 = await api('GET', `/reports/${reportId}/download/${csvExport.id}`);
    check('T5: GET /download/:exportId (CSV) → 200', t5.status === 200, t5.body);
    check('T5: Returns signedUrl string', typeof t5.body.data?.signedUrl === 'string', t5.body.data);
    check('T5: Format is CSV', t5.body.data?.format === 'CSV', t5.body.data?.format);
  } else {
    check('T5: CSV export exists', false, 'No CSV export found in report');
  }

  // ─── TEST: T6 — List Reports (now has one) ────────────────────
  console.log('\n📋 T6: List Reports (should have 1 now)');
  const t6 = await api('GET', '/reports');
  check('T6: GET /reports → 200', t6.status === 200, t6.body);
  check('T6: Reports list non-empty', (t6.body.data?.length || 0) >= 1, t6.body.data?.length);
  check('T6: Pagination meta present', typeof t6.body.meta?.total === 'number', t6.body.meta);

  // ─── TEST: T7 — Generate Monthly Report ──────────────────────
  console.log('\n📋 T7: Generate Monthly Report with AI insights');
  const t7 = await api('POST', '/reports/generate', {
    type: 'MONTHLY_REPORT',
    periodStart,
    periodEnd,
    formats: ['PDF'],
    emailTo: [],
  });
  check('T7: POST /reports/generate (MONTHLY) → 201', t7.status === 201, t7.body);
  check('T7: Monthly report type', t7.body.data?.type === 'MONTHLY_REPORT', t7.body.data?.type);
  check('T7: Status is READY', t7.body.data?.status === 'READY', t7.body.data?.status);

  // ─── TEST: T8 — Filter Reports by Type ───────────────────────
  console.log('\n📋 T8: Filter Reports by type=DAILY_SUMMARY');
  const t8 = await api('GET', '/reports?type=DAILY_SUMMARY');
  check('T8: GET /reports?type=DAILY_SUMMARY → 200', t8.status === 200, t8.body);
  const allDaily = t8.body.data?.every((r) => r.type === 'DAILY_SUMMARY');
  check('T8: All results have type DAILY_SUMMARY', allDaily !== false, t8.body.data?.map((r) => r.type));

  // ─── TEST: T9 — Create WEEKLY Report Schedule ─────────────────
  console.log('\n📋 T9: Create WEEKLY Report Schedule (every Monday)');
  const t9 = await api('POST', '/reports/schedules', {
    type: 'WEEKLY_REPORT',
    frequency: 'WEEKLY',
    formats: ['PDF', 'CSV'],
    emailTo: ['ceo@meridian.in', 'cfo@meridian.in'],
    dayOfWeek: 1, // Monday
  });
  check('T9: POST /reports/schedules → 201', t9.status === 201, t9.body);
  check('T9: Schedule has id',        Boolean(t9.body.data?.id), t9.body.data);
  check('T9: Frequency = WEEKLY',     t9.body.data?.frequency === 'WEEKLY', t9.body.data?.frequency);
  check('T9: isActive defaults true', t9.body.data?.isActive === true, t9.body.data?.isActive);
  check('T9: nextRunAt is set',       Boolean(t9.body.data?.nextRunAt), t9.body.data?.nextRunAt);

  const scheduleId = t9.body.data?.id;

  // ─── TEST: T10 — List Schedules ───────────────────────────────
  console.log('\n📋 T10: List Schedules');
  const t10 = await api('GET', '/reports/schedules');
  check('T10: GET /reports/schedules → 200', t10.status === 200, t10.body);
  check('T10: At least 1 schedule',   (t10.body.data?.length || 0) >= 1, t10.body.data?.length);

  // ─── TEST: T11 — Toggle Schedule Inactive ────────────────────
  console.log('\n📋 T11: Toggle Schedule isActive = false');
  const t11 = await api('PATCH', `/reports/schedules/${scheduleId}`, {
    isActive: false,
  });
  check('T11: PATCH /schedules/:id → 200', t11.status === 200, t11.body);
  check('T11: isActive = false',           t11.body.data?.isActive === false, t11.body.data?.isActive);

  // ─── TEST: T12 — Create MONTHLY Schedule ─────────────────────
  console.log('\n📋 T12: Create MONTHLY Report Schedule (1st of month)');
  const t12 = await api('POST', '/reports/schedules', {
    type: 'MONTHLY_REPORT',
    frequency: 'MONTHLY',
    formats: ['PDF', 'XLSX'],
    emailTo: ['reports@meridian.in'],
    dayOfMonth: 1,
  });
  check('T12: POST /reports/schedules (MONTHLY) → 201', t12.status === 201, t12.body);
  check('T12: Frequency = MONTHLY',   t12.body.data?.frequency === 'MONTHLY', t12.body.data?.frequency);
  check('T12: dayOfMonth = 1',        t12.body.data?.dayOfMonth === 1, t12.body.data?.dayOfMonth);

  // ─── TEST: T13 — Delete Schedule ─────────────────────────────
  console.log('\n📋 T13: Delete WEEKLY Schedule');
  const t13 = await api('DELETE', `/reports/schedules/${scheduleId}`);
  check('T13: DELETE /schedules/:id → 204', t13.status === 204, t13.status);

  // Confirm deletion
  const t13b = await api('GET', '/reports/schedules');
  const stillExists = t13b.body.data?.some((s) => s.id === scheduleId);
  check('T13: Schedule no longer in list', !stillExists, stillExists);

  // ─── TEST: T14 — Multi-Org Isolation ─────────────────────────
  console.log('\n📋 T14: Multi-Org Isolation — Org B cannot access Org A report');
  const t14 = await apiB('GET', `/reports/${reportId}`);
  check('T14: Org B gets 404 on Org A report', t14.status === 404, t14.status);

  // ─── TEST: T15 — Validation: Missing required fields ─────────
  console.log('\n📋 T15: Validation — missing periodStart returns 400');
  const t15 = await api('POST', '/reports/generate', {
    type: 'DAILY_SUMMARY',
    formats: ['PDF'],
  });
  check('T15: POST /reports/generate (missing periodStart) → 400', t15.status === 400, t15.body);

  // ─── TEST: T16 — Validation: Invalid date range ───────────────
  console.log('\n📋 T16: Validation — periodStart > periodEnd returns 400');
  const t16 = await api('POST', '/reports/generate', {
    type: 'DAILY_SUMMARY',
    periodStart: new Date().toISOString(),
    periodEnd: thirtyDaysAgo.toISOString(),
    formats: ['PDF'],
  });
  check('T16: Invalid date range → 400', t16.status === 400, t16.body);

  // ─── TEST: T17 — Delete Report ────────────────────────────────
  console.log('\n📋 T17: Delete Report');
  const t17 = await api('DELETE', `/reports/${reportId}`);
  check('T17: DELETE /reports/:id → 204', t17.status === 204, t17.status);

  // Confirm deletion
  const t17b = await api('GET', `/reports/${reportId}`);
  check('T17: Report no longer accessible', t17b.status === 404, t17b.status);

  // ─── Cleanup ──────────────────────────────────────────────────
  console.log('\n🧹 Cleaning up test data...');
  try {
    await prisma.session.deleteMany({ where: { userId: { in: [user.id, userB.id] } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: [org.id, orgB.id] } } });
    await prisma.sale.deleteMany({ where: { organizationId: org.id } });
    await prisma.expense.deleteMany({ where: { organizationId: org.id } });
    await prisma.inventoryItem.deleteMany({ where: { organizationId: org.id } });
    await prisma.product.deleteMany({ where: { organizationId: org.id } });
    await prisma.customer.deleteMany({ where: { organizationId: org.id } });
    await prisma.reportExport.deleteMany({ where: { report: { organizationId: { in: [org.id, orgB.id] } } } });
    await prisma.report.deleteMany({ where: { organizationId: { in: [org.id, orgB.id] } } });
    await prisma.reportSchedule.deleteMany({ where: { organizationId: { in: [org.id, orgB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org.id, orgB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, userB.id] } } });
    console.log('✅ Cleanup complete');
  } catch (e) {
    console.warn('⚠️  Cleanup partial:', e.message);
  }

  // ─── Results ──────────────────────────────────────────────────
  console.log('\n======================================================');
  console.log(`📊 REPORT GENERATION TEST RESULTS`);
  console.log('======================================================');
  console.log(`  ✅ PASSED: ${pass.length}`);
  console.log(`  ❌ FAILED: ${fail.length}`);
  console.log(`  📌 TOTAL:  ${pass.length + fail.length}`);

  if (fail.length > 0) {
    console.log('\n❌ Failed Tests:');
    fail.forEach((f) => console.log('  • ' + f));
  }

  console.log('\n' + (fail.length === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed.'));
  console.log('======================================================\n');

  await prisma.$disconnect();
  process.exit(fail.length > 0 ? 1 : 0);
}

testReportGeneration().catch((err) => {
  console.error('❌ Test runner crashed:', err.message);
  console.error(err.stack);
  prisma.$disconnect().finally(() => process.exit(1));
});
