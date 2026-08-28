// src/config/env.js
// ============================================================
// Environment Variable Validation
// Uses Zod to validate all required env vars at startup.
// If any required variable is missing → app crashes immediately
// with a clear error message (fail fast principle).
// ============================================================

import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  API_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Auth
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),
  SESSION_TTL_SECONDS: z.string().default('604800').transform(Number),

  // Supabase Storage
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  STORAGE_BUCKET: z.string().default('decisionos-files'),

  // Email
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email'),

  // AI
  AI_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Razorpay Payment Gateway
  RAZORPAY_KEY_ID: z.string().default('rzp_test_decisionos_dev'),
  RAZORPAY_KEY_SECRET: z.string().default('decisionos_razorpay_secret_dev'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('decisionos_razorpay_webhook_secret_dev'),

  // Admin
  SUPER_ADMIN_EMAIL: z.string().email(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Invalid environment configuration:\n');
    result.error.issues.forEach((issue) => {
      console.error(`  ✗ ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('\n→ Check your .env file and fix the above issues.\n');
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
