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
import compression from 'compression';
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
import { razorpayWebhook } from './modules/billing/billing.controller.js';

const app = express();

// ── 0. Production Reverse Proxy Trust ─────────────────────────
// Required behind Nginx, Cloudflare, Docker, AWS ALB for accurate IP extraction
app.set('trust proxy', 1);

// ── 1. Security Headers (Helmet) ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── 2. Response Compression (Gzip / Deflate) ──────────────────
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses if client says not to
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // Compress responses over 1 KB
}));

// ── 3. CORS ───────────────────────────────────────────────────
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    // or if origin is in ALLOWED_ORIGINS, or is any Vercel domain (*.vercel.app), or localhost
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost')
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
    }
  },
  credentials: true,       // Required for cookies to be sent cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ── 4a. Razorpay Webhook raw-body capture (MUST be before express.json) ──
// Razorpay HMAC SHA-256 signature verification requires the exact raw request bytes.
app.post(
  '/api/v1/billing/webhook/razorpay',
  express.raw({ type: 'application/json', limit: '2mb' }),
  razorpayWebhook
);

// ── 4b. Body Parser (Standard JSON for all other API endpoints) ──
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── 5. Cookie Parser ──────────────────────────────────────────
app.use(cookieParser(env.COOKIE_SECRET));

// ── 6. Request ID Middleware ──────────────────────────────────
// Attaches a unique UUID to every request for tracing
app.use((req, res, next) => {
  const requestId = uuidv4();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ── 7. Production Request Logger ──────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isProd = env.NODE_ENV === 'production';

    if (isProd) {
      // Structured JSON logging for production aggregators (Datadog, Loki, CloudWatch)
      console.log(JSON.stringify({
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }));
    } else {
      const logFn = res.statusCode >= 500 ? console.error : res.statusCode >= 400 ? console.warn : console.log;
      logFn(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.path} ${res.statusCode} ${duration}ms — ${res.locals.requestId}`);
    }
  });
  next();
});

// ── 8. Global Rate Limiter ────────────────────────────────────
app.use(globalLimiter);

// ── 9. Health & Readiness Probes ──────────────────────────────
// Liveness probe (Kubernetes / Docker simple check)
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Full readiness probe (Database + Redis verification)
app.get(['/health', '/health/ready'], async (req, res) => {
  const { redisHealthCheck } = await import('./config/redis.js');
  const { prisma } = await import('./lib/prisma.js');

  let dbOk = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch { /* ignore */ }

  redisOk = await redisHealthCheck();

  const isHealthy = dbOk && redisOk;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    version: '2.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected',
    },
  });
});

// ── 10. API Routes ────────────────────────────────────────────
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

// ── 11. 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  return sendError(
    res, 404, 'NOT_FOUND',
    `Route ${req.method} ${req.path} not found.`
  );
});

// ── 12. Global Production Error Handler ───────────────────────
// Catches all synchronous and asynchronous unhandled errors
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const requestId = res.locals?.requestId || 'unknown';
  const isProd = env.NODE_ENV === 'production';

  // Server-side logging
  if (isProd) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode,
      errorCode: err.code || 'SERVER_ERROR',
      message: err.message,
      stack: err.stack,
    }));
  } else {
    console.error('[Error]', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      message: err.message,
      stack: err.stack,
    });
  }

  // Safe client response — strictly mask internal database/Prisma errors in production
  const clientMessage = isProd && statusCode >= 500
    ? 'An unexpected error occurred. Please try again later.'
    : err.message;

  return sendError(
    res,
    statusCode,
    err.code || 'SERVER_ERROR',
    clientMessage
  );
});

export default app;
