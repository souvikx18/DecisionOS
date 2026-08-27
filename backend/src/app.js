// src/app.js
// ============================================================
// Express Application Setup
// This file configures the Express app (middleware, routes).
// The HTTP server is created separately in server.js.
// This separation makes the app testable with Supertest.
// ============================================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimit.middleware.js';
import { sendError } from './lib/response.js';

// ── Routers ───────────────────────────────────────────────────
import authRouter        from './modules/auth/auth.router.js';
import orgRouter         from './modules/organizations/org.router.js';
import membersRouter     from './modules/members/members.router.js';
import invitationsRouter from './modules/invitations/invitations.router.js';
import customersRouter   from './modules/customers/customers.router.js';
import productsRouter    from './modules/products/products.router.js';
import salesRouter       from './modules/sales/sales.router.js';
import expensesRouter    from './modules/expenses/expenses.router.js';
import inventoryRouter   from './modules/inventory/inventory.router.js';
import analyticsRouter   from './modules/analytics/analytics.router.js';
import importsRouter     from './modules/imports/imports.router.js';
import aiRouter          from './modules/ai/ai.router.js';
import reportsRouter     from './modules/reports/reports.router.js';
import realtimeRouter    from './modules/realtime/realtime.router.js';
import billingRouter     from './modules/billing/billing.router.js';
import { stripeWebhook } from './modules/billing/billing.controller.js';

const app = express();

// ── 1. Security Headers (Helmet) ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── 2. CORS ───────────────────────────────────────────────────
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
    }
  },
  credentials: true,       // Required for cookies to be sent cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── 3a. Stripe Webhook raw-body capture (MUST be before express.json) ────
// Stripe cryptographic HMAC signature verification requires the exact raw request bytes.
app.post(
  '/api/v1/billing/webhook/stripe',
  express.raw({ type: 'application/json', limit: '2mb' }),
  stripeWebhook
);

// ── 3b. Body Parser (Standard JSON for all other API endpoints) ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── 4. Cookie Parser ──────────────────────────────────────────
app.use(cookieParser(env.COOKIE_SECRET));

// ── 5. Request ID Middleware ──────────────────────────────────
// Attaches a unique UUID to every request for tracing
app.use((req, res, next) => {
  const requestId = uuidv4();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ── 6. Request Logger (simple, no pino-http for now) ─────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logFn = res.statusCode >= 500 ? console.error : res.statusCode >= 400 ? console.warn : console.log;
    logFn(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms — ${res.locals.requestId}`);
  });
  next();
});

// ── 7. Global Rate Limiter ────────────────────────────────────
app.use(globalLimiter);

// ── 8. Health Check (no auth, no rate limit) ──────────────────
app.get('/health', async (req, res) => {
  const { redisHealthCheck } = await import('./config/redis.js');
  const { prisma } = await import('./lib/prisma.js');

  let dbOk = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch { /* ignore */ }

  redisOk = await redisHealthCheck();

  const status = dbOk && redisOk ? 'healthy' : 'degraded';

  res.status(dbOk && redisOk ? 200 : 503).json({
    status,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected',
    },
  });
});

// ── 9. API Routes ─────────────────────────────────────────────
app.use('/api/v1/auth',          authRouter);
app.use('/api/v1/organizations', orgRouter);
app.use('/api/v1/members',       membersRouter);
app.use('/api/v1/invitations',   invitationsRouter);
app.use('/api/v1/customers',     customersRouter);
app.use('/api/v1/products',      productsRouter);
app.use('/api/v1/sales',         salesRouter);
app.use('/api/v1/expenses',      expensesRouter);
app.use('/api/v1/inventory',     inventoryRouter);
app.use('/api/v1/analytics',     analyticsRouter);
app.use('/api/v1/imports',       importsRouter);
app.use('/api/v1/ai',            aiRouter);
app.use('/api/v1/reports',       reportsRouter);
app.use('/api/v1/realtime',      realtimeRouter);
app.use('/api/v1/billing',       billingRouter);

// ── 10. 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  return sendError(
    res, 404, 'NOT_FOUND',
    `Route ${req.method} ${req.path} not found.`
  );
});

// ── 11. Global Error Handler ──────────────────────────────────
// Catches any error thrown from routes/middleware
// NEVER sends stack traces to the client in production
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Log the full error server-side
  console.error('[Error]', {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Send safe error to client
  return sendError(
    res,
    statusCode,
    err.code || 'SERVER_ERROR',
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : err.message
  );
});

export default app;
