// test/billing.test.js
// ============================================================
// Encrypted Subscription & Billing Module Integration Test Suite
// ============================================================

import 'dotenv/config';
import { encrypt, decrypt, maskIdentifier } from '../src/lib/encryption.js';
import {
  getPlansService,
  getSubscriptionService,
  createCheckoutSessionService,
  createPortalSessionService,
  listInvoicesService,
  handleRazorpayWebhookService,
} from '../src/modules/billing/billing.service.js';
import { prisma } from '../src/lib/prisma.js';
import crypto from 'node:crypto';

async function testBillingSuite() {
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
  console.log('💳 TESTING ENCRYPTED BILLING & SUBSCRIPTION MODULE');
  console.log('======================================================\n');

  try {
    // ── 1. AES-256-GCM Encryption Tests ─────────────────────────
    console.log('🔒 1. Testing AES-256-GCM Field Encryption & Masking...');
    const plainText = 'cus_stripe_live_secret_customer_token_9999';
    const cipherText = encrypt(plainText);

    check('Encryption produces distinct ciphertext starting with enc:', cipherText.startsWith('enc:'));
    check('Ciphertext is different from plaintext', cipherText !== plainText);

    const decryptedText = decrypt(cipherText);
    check('Decryption correctly recovers original secret', decryptedText === plainText);

    const masked = maskIdentifier('cus_live_9876543210', 4);
    check('Masking correctly preserves only last 4 digits', masked === '•••• 3210');

    // ── 2. Setup Test Organization & Subscription in Database ───
    console.log('\n🏢 2. Setting up test organization for quota & billing verification...');
    const orgId = 'bill_org_' + Date.now();
    const userId = 'bill_user_' + Date.now();

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: `billing_${Date.now()}@decisionos.com`,
        firstName: 'Billing',
        lastName: 'Tester',
        passwordHash: 'dummy_hash',
      },
    });

    const org = await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Billing Test Enterprise',
        slug: `billing-test-${Date.now()}`,
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    // ── 3. Test Plans Catalog API ──────────────────────────────
    console.log('\n📋 3. Testing Plans Catalog & Pricing Matrix...');
    const plansData = await getPlansService(org.id);
    check('Plan catalog contains FREE, PRO, ENTERPRISE tiers', plansData.plans.length === 3);
    check('Active tier defaults to FREE', plansData.activeTier === 'FREE');

    // ── 4. Test Subscription & Live Quotas ─────────────────────
    console.log('\n📊 4. Testing Subscription & Live Quota Calculation...');
    const subData = await getSubscriptionService(org.id);
    check('Subscription tier is FREE', subData.tier === 'FREE');
    check('Quotas list has 4 resource meters', subData.quotas.length === 4);
    check('Seats quota correctly reflects 1 active member', subData.quotas.find((q) => q.key === 'seats')?.used === 1);

    // ── 5. Test Checkout Session & Plan Upgrade ────────────────
    console.log('\n🚀 5. Testing Checkout Session Creation (Upgrade to PRO)...');
    const checkoutResult = await createCheckoutSessionService(org.id, user.id, {
      planTier: 'PRO',
      interval: 'yearly',
      currency: 'INR',
      gateway: 'stripe',
    });

    check('Checkout session returns target plan tier PRO', checkoutResult.planTier === 'PRO');
    check('Checkout session generates valid checkout redirect URL', Boolean(checkoutResult.checkoutUrl));

    // Verify DB subscription state after upgrade
    const updatedSub = await prisma.subscription.findUnique({
      where: { organizationId: org.id },
      include: { plan: true },
    });

    check('Database subscription plan updated to PRO', updatedSub?.plan?.tier === 'PRO');
    check('Database subscription status is ACTIVE', updatedSub?.status === 'ACTIVE');
    check('Customer reference ID is stored encrypted in DB', updatedSub?.stripeCustomerId?.startsWith('enc:'));

    // ── 6. Test Customer Portal Session ────────────────────────
    console.log('\n🚪 6. Testing Customer Portal Session Generation...');
    const portalResult = await createPortalSessionService(org.id);
    check('Portal session URL generated successfully', Boolean(portalResult.portalUrl));

    // ── 7. Test Invoices & Receipts Ledger ─────────────────────
    console.log('\n📑 7. Testing Invoices & Receipts Ledger...');
    const invoices = await listInvoicesService(org.id);
    check('Invoices ledger contains payment record', invoices.length > 0);
    check('Invoice contains valid currency amount and PAID status', invoices[0].status === 'PAID');

    // ── 8. Test Webhook Signature Verification ─────────────────
    console.log('\n🛡️ 8. Testing Razorpay HMAC Webhook Signature Verification...');
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_key_12345';
    const payload = JSON.stringify({ event: 'subscription.charged', orgId: org.id });
    const validSignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');

    const webhookResult = handleRazorpayWebhookService(payload, validSignature);
    check('Valid HMAC signature accepted', webhookResult.received === true);

    let signatureRejected = false;
    try {
      handleRazorpayWebhookService(payload, 'tampered_invalid_signature_xyz');
    } catch {
      signatureRejected = true;
    }
    check('Invalid / tampered signature strictly rejected', signatureRejected);

    // ── 9. Cleanup ─────────────────────────────────────────────
    await prisma.payment.deleteMany({ where: { subscription: { organizationId: org.id } } });
    await prisma.subscription.deleteMany({ where: { organizationId: org.id } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.deleteMany({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });

    console.log('\n======================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${pass.length} passed, ${fail.length} failed`);
    console.log('======================================================\n');

    process.exit(fail.length > 0 ? 1 : 0);

  } catch (err) {
    console.error('❌ Billing test crashed:', err);
    process.exit(1);
  }
}

testBillingSuite();
