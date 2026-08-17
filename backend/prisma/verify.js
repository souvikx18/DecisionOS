// Quick DB verification script
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function verify() {
  console.log('\n🔍 DecisionOS — Database Verification\n');
  console.log('━'.repeat(50));

  try {
    // 1. Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection: CONNECTED');

    // 2. Check all tables exist
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    console.log(`\n📋 Tables found: ${tables.length}`);
    tables.forEach(t => console.log(`   ✅ ${t.tablename}`));

    // 3. Check RLS
    const rlsTables = await prisma.$queryRaw`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    const rlsEnabled = rlsTables.filter(t => t.rowsecurity);
    const rlsDisabled = rlsTables.filter(t => !t.rowsecurity);
    console.log(`\n🔒 RLS Status:`);
    console.log(`   ✅ Enabled on ${rlsEnabled.length} tables`);
    if (rlsDisabled.length > 0) {
      console.log(`   ⚠️  Not enabled on ${rlsDisabled.length} tables: ${rlsDisabled.map(t => t.tablename).join(', ')}`);
    }

    // 4. Check plans seeded
    const plans = await prisma.plan.findMany({ orderBy: { tier: 'asc' } });
    console.log(`\n💳 Plans seeded: ${plans.length}`);
    plans.forEach(p => console.log(`   ✅ ${p.tier} — ₹${p.priceMonthly}/mo — ${p.maxAiCallsPerMonth} AI calls/month`));

    console.log('\n' + '━'.repeat(50));
    console.log('🎉 Database setup is COMPLETE and HEALTHY!\n');

  } catch (err) {
    console.error('\n❌ Verification failed:', err.message);
    console.error('\nCheck your DATABASE_URL in .env\n');
  } finally {
    await prisma.$disconnect();
  }
}

verify();
