// src/server.js
// ============================================================
// HTTP Server Entry Point
// Imports the Express app and starts listening.
// Separated from app.js so tests can import app without
// starting the HTTP server.
// ============================================================

import 'dotenv/config';
import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { getRedis } from './config/redis.js';
import { prisma } from './lib/prisma.js';
import { startImportWorker, closeImportWorker } from './workers/import.worker.js';

const server = http.createServer(app);

async function startServer() {
  try {
    // 1. Verify database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected');

    // 2. Initialize Redis connection
    const redis = getRedis();
    await redis.ping();
    console.log('✅ Redis connected');

    // 3. Start BullMQ background import worker
    startImportWorker();

    // 4. Start HTTP server
    server.listen(env.PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║        DecisionOS Backend v2.0.0                 ║');
      console.log('║        AI-Powered Business Intelligence SaaS     ║');
      console.log('╠══════════════════════════════════════════════════╣');
      console.log(`║  🌐 API:      http://localhost:${env.PORT}/api/v1     ║`);
      console.log(`║  ❤️  Health:  http://localhost:${env.PORT}/health      ║`);
      console.log(`║  🔧 Mode:     ${env.NODE_ENV.padEnd(36)}║`);
      console.log('╚══════════════════════════════════════════════════╝');
      console.log('');
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

// ── Graceful Shutdown ─────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('[Server] ✅ Database disconnected');

      await closeImportWorker();
      console.log('[Server] ✅ Import worker stopped');

      const redis = getRedis();
      await redis.quit();
      console.log('[Server] ✅ Redis disconnected');

      console.log('[Server] ✅ Shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('[Server] ❌ Error during shutdown:', err.message);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('[Server] ❌ Force shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.message);
  process.exit(1);
});

startServer();
