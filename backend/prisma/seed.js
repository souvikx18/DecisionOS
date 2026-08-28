// prisma/seed.js
// Run with: node prisma/seed.js
// Seeds the Plans table with FREE, PRO, ENTERPRISE tiers

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Upsert Plans ────────────────────────────────────────────
  const free = await prisma.plan.upsert({
    where: { tier: 'FREE' },
    update: {},
    create: {
      name: 'Free',
      tier: 'FREE',
      razorpayPlanId: null,
      priceMonthly: 0,
      priceYearly: 0,
      maxMembers: 2,
      maxAiCallsPerMonth: 5,
      maxImportsPerMonth: 3,
      maxStorageMb: 100,
      features: {
        aiInsights: true,
        aiForecasting: false,
        aiChurnPrediction: false,
        pdfExport: false,
        scheduledReports: false,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
      },
    },
  });

  const pro = await prisma.plan.upsert({
    where: { tier: 'PRO' },
    update: {},
    create: {
      name: 'Pro',
      tier: 'PRO',
      razorpayPlanId: null, // add your Stripe price ID later
      priceMonthly: 2999,  // ₹2999/month in paise? No — store in paisa: 299900
      priceYearly: 29900,
      maxMembers: 10,
      maxAiCallsPerMonth: 100,
      maxImportsPerMonth: 50,
      maxStorageMb: 5000,
      features: {
        aiInsights: true,
        aiForecasting: true,
        aiChurnPrediction: true,
        pdfExport: true,
        scheduledReports: true,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
      },
    },
  });

  const enterprise = await prisma.plan.upsert({
    where: { tier: 'ENTERPRISE' },
    update: {},
    create: {
      name: 'Enterprise',
      tier: 'ENTERPRISE',
      razorpayPlanId: null,
      priceMonthly: 9999,
      priceYearly: 99990,
      maxMembers: 9999,
      maxAiCallsPerMonth: 9999,
      maxImportsPerMonth: 9999,
      maxStorageMb: 100000,
      features: {
        aiInsights: true,
        aiForecasting: true,
        aiChurnPrediction: true,
        pdfExport: true,
        scheduledReports: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
      },
    },
  });

  console.log('✅ Plans seeded:');
  console.log('   FREE      →', free.id);
  console.log('   PRO       →', pro.id);
  console.log('   ENTERPRISE →', enterprise.id);
  console.log('');
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
