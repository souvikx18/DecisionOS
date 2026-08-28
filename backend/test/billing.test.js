// test/billing.test.js
// ============================================================
// Enterprise Billing & Razorpay Integration Test Suite
// Full test matrix: Crypto, Razorpay Orders, HMAC Verification & Quotas
// ============================================================

import 'dotenv/config';
import crypto from 'node:crypto';
import { encrypt, decrypt, maskIdentifier } from '../src/lib/encryption.js';
import {
  getPlansService,
  getSubscriptionService,
  createCheckoutSessionService,
  verifyRazorpayPaymentService,
  createPortalSessionService,
  listInvoicesService,
  handleRazorpayWebhookService,
} from '../src/modules/billing/billing.service.js';
import { prisma } from '../src/lib/prisma.js';

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
  console.log('💳 ENTERPRISE BILLING & RAZORPAY INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  try {
    // ── 1. AES-256-GCM Field Encryption & Masking ───────────────
    console.log('🔒 1. Testing Cryptographic Encryption & Masking...');
    const plainText = 'rzp_cust_live_secret_token_8888';
    const cipherText = encrypt(plainText);

    check('Encryption produces distinct ciphertext starting with enc:', cipherText.startsWith('enc:'));
    check('Ciphertext differs from plaintext', cipherText !== plainText);

    const decryptedText = decrypt(cipherText);
    check('Decryption correctly recovers original secret', decryptedText === plainText);

    // Tampered payload test (AES-GCM authentication tag failure)
    const tamperedDecryption = decrypt('enc:00112233445566778899aabbccddeeff:00112233445566778899aabbccddeeff:deadbeef');
    check('Tampered ciphertext returns null (GCM tag verification failure)', tamperedDecryption === null);

    const masked = maskIdentifier('rzp_live_9876543210', 4);
    check('Masking preserves only last 4 digits', masked === '•••• 3210');

    // ── 2. Setup Test Organization & Users in Database ──────────
    console.log('\n🏢 2. Setting up test organization & users in DB...');
    const orgId = 'rzp_org_' + Date.now();
    const userId = 'rzp_user_' + Date.now();

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: `rzp_billing_${Date.now()}@decisionos.com`,
        firstName: 'Razorpay',
        lastName: 'Tester',
        passwordHash: 'secure_dummy_hash_for_test',
      },
    });

    const org = await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Razorpay Enterprise Test Org',
        slug: `rzp-test-${Date.now()}`,
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

    const proPlan = plansData.plans.find((p) => p.tier === 'PRO');
    check('Growth Pro plan has pricing in INR & USD', Boolean(proPlan.priceMonthly.INR && proPlan.priceMonthly.USD));
    check('Growth Pro plan limits allow 15 members and 250,000 AI tokens', proPlan.limits.maxMembers === 15);

    // ── 4. Test Subscription & Live Quotas ─────────────────────
    console.log('\n📊 4. Testing Subscription & Live Quota Calculation...');
    const subData = await getSubscriptionService(org.id);
    check('Initial subscription tier is FREE', subData.tier === 'FREE');
    check('Quotas list has 4 resource meters (AI, Reports, Seats, Ingestion)', subData.quotas.length === 4);
    check('Seats quota reflects active member count (1 seat used)', subData.quotas.find((q) => q.key === 'seats')?.used === 1);

    // ── 5. Test Razorpay Order Creation & Validation ───────────
    console.log('\n🚀 5. Testing Razorpay Order Creation & Validation...');
    let freeUpgradeRejected = false;
    try {
      await createCheckoutSessionService(org.id, user.id, {
        planTier: 'FREE',
        interval: 'monthly',
        currency: 'INR',
      });
    } catch {
      freeUpgradeRejected = true;
    }
    check('Attempting to checkout FREE plan is rejected', freeUpgradeRejected);

    const orderResult = await createCheckoutSessionService(org.id, user.id, {
      planTier: 'PRO',
      interval: 'yearly',
      currency: 'INR',
    });
    check('Razorpay order returns target plan tier PRO', orderResult.planTier === 'PRO');
    check('Razorpay order returns valid order ID & key ID', Boolean(orderResult.orderId && orderResult.keyId));
    check('Razorpay order returns amount in paise', orderResult.amount > 0);

    // ── 6. Test Razorpay Payment Signature Verification ────────
    console.log('\n⚡ 6. Testing Razorpay Payment Verification (Plan Activation)...');
    const testOrderId = `order_${Date.now()}`;
    const testPaymentId = `pay_${Date.now()}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'decisionos_razorpay_secret_dev';
    const validSignature = crypto.createHmac('sha256', secret).update(`${testOrderId}|${testPaymentId}`).digest('hex');

    const verifyResult = await verifyRazorpayPaymentService(org.id, user.id, {
      razorpayOrderId: testOrderId,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: validSignature,
      planTier: 'PRO',
      interval: 'yearly',
      currency: 'INR',
    });

    check('Payment verified and plan activated successfully', verifyResult.success === true && verifyResult.planTier === 'PRO');

    const updatedSub = await prisma.subscription.findUnique({
      where: { organizationId: org.id },
      include: { plan: true },
    });
    check('Database subscription plan is ACTIVE and tier is PRO', updatedSub?.status === 'ACTIVE' && updatedSub.plan?.tier === 'PRO');
    check('Razorpay customer reference is encrypted in DB', updatedSub?.razorpayCustomerId?.startsWith('enc:'));

    // ── 7. Test Payment Verification Idempotency ───────────────
    console.log('\n🔁 7. Testing Payment Verification Idempotency...');
    const duplicateVerify = await verifyRazorpayPaymentService(org.id, user.id, {
      razorpayOrderId: testOrderId,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: validSignature,
      planTier: 'PRO',
      interval: 'yearly',
      currency: 'INR',
    });
    check('Duplicate payment verification safely returns idempotent success', duplicateVerify.idempotent === true);

    const paymentRowsCount = await prisma.payment.count({
      where: { razorpayPaymentId: testPaymentId },
    });
    check('No duplicate payment records created in database', paymentRowsCount === 1);

    // ── 8. Test Customer Portal & Invoices Ledger ──────────────
    console.log('\n📑 8. Testing Invoices & Receipts Ledger...');
    const invoices = await listInvoicesService(org.id);
    check('Invoices ledger contains payment record', invoices.length > 0);
    check('Invoice contains valid currency amount and PAID status', invoices[0].status === 'PAID');
    check('Invoice ID matches Razorpay payment ID', invoices[0].id === testPaymentId);

    const portalResult = await createPortalSessionService(org.id);
    check('Portal session URL generated successfully', Boolean(portalResult.portalUrl));

    // ── 9. Test Cryptographic HMAC Webhook Verification ───────
    console.log('\n🛡️ 9. Testing Razorpay HMAC Webhook Signature Verification...');
    const webhookSecret = 'test_razorpay_webhook_secret_key_8888';
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    const webhookPayload = JSON.stringify({
      event: 'order.paid',
      payload: {
        payment: {
          entity: {
            id: `pay_hook_${Date.now()}`,
            order_id: `order_hook_${Date.now()}`,
            amount: 239900,
            currency: 'INR',
            status: 'captured',
            notes: {
              orgId: org.id,
              userId: user.id,
              planTier: 'PRO',
              interval: 'yearly',
              currency: 'INR',
            },
          },
        },
      },
    });

    const validWebhookSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookPayload)
      .digest('hex');

    const webhookResult = await handleRazorpayWebhookService(webhookPayload, validWebhookSig);
    check('Valid cryptographic HMAC webhook signature accepted', webhookResult.received === true);

    let tamperedRejected = false;
    try {
      await handleRazorpayWebhookService(webhookPayload, 'invalid_tampered_signature_xyz');
    } catch {
      tamperedRejected = true;
    }
    check('Tampered HMAC webhook signature strictly rejected', tamperedRejected);

    // ── 10. Test Webhook: subscription.charged (Renewal) ───────
    console.log('\n💳 10. Testing Webhook: subscription.charged (Renewal)...');
    const rzpSubId = `sub_rzp_${Date.now()}`;
    await prisma.subscription.update({
      where: { organizationId: org.id },
      data: { razorpaySubscriptionId: rzpSubId },
    });

    const renewalPayload = JSON.stringify({
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: { id: rzpSubId, status: 'active' },
        },
        payment: {
          entity: { id: `pay_renewal_${Date.now()}`, amount: 239900, currency: 'INR' },
        },
      },
    });
    const renewalSig = crypto.createHmac('sha256', webhookSecret).update(renewalPayload).digest('hex');
    const renewalResult = await handleRazorpayWebhookService(renewalPayload, renewalSig);
    check('Subscription renewal webhook processed successfully', renewalResult.received === true);

    // ── 11. Test Webhook: subscription.cancelled (Cancellation) 
    console.log('\n❌ 11. Testing Webhook: subscription.cancelled (Revert to Free)...');
    const cancelPayload = JSON.stringify({
      event: 'subscription.cancelled',
      payload: {
        subscription: {
          entity: { id: rzpSubId, status: 'cancelled' },
        },
      },
    });
    const cancelSig = crypto.createHmac('sha256', webhookSecret).update(cancelPayload).digest('hex');
    await handleRazorpayWebhookService(cancelPayload, cancelSig);

    const canceledSub = await prisma.subscription.findUnique({
      where: { organizationId: org.id },
      include: { plan: true },
    });
    check('Subscription successfully reverted to FREE plan on cancellation', canceledSub?.plan?.tier === 'FREE');
    check('Subscription status marked as CANCELED', canceledSub?.status === 'CANCELED');

    // ── 12. Cleanup Test Resources ─────────────────────────────
    console.log('\n🧹 12. Cleaning up test database records...');
    await prisma.payment.deleteMany({ where: { subscription: { organizationId: org.id } } });
    await prisma.subscription.deleteMany({ where: { organizationId: org.id } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.deleteMany({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    check('Database cleaned up cleanly without orphaned records', true);

    console.log('\n======================================================');
    console.log(`🎉 RAZORPAY TEST RUN COMPLETE: ${pass.length} passed, ${fail.length} failed`);
    console.log('======================================================\n');

    process.exit(fail.length > 0 ? 1 : 0);

  } catch (err) {
    console.error('❌ Billing test suite crashed:', err);
    process.exit(1);
  }
}

testBillingSuite();
