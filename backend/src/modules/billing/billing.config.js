// src/modules/billing/billing.config.js
// ============================================================
// Billing Plans & Razorpay Gateway Configuration
// ============================================================

import { env } from '../../config/env.js';

export const PLANS_CATALOG = {
  FREE: {
    id: 'plan_free',
    tier: 'FREE',
    name: 'Starter Free',
    tagline: 'Core business intelligence for solo founders and early-stage teams.',
    priceMonthly: { INR: 0, USD: 0 },
    priceYearly: { INR: 0, USD: 0 },
    limits: {
      maxMembers: 3,
      maxAiCallsPerMonth: 10000,
      maxReportsPerMonth: 10,
      maxImportsPerMonth: 5,
      maxIngestionRows: 50000,
      maxStorageMb: 100,
      fileRetentionDays: 7,
    },
    features: [
      '1 Organization Workspace',
      'Up to 3 Team Member Seats',
      '10,000 AI Reasoning Tokens / mo',
      '10 Automated Report Exports / mo',
      'Standard CSV & XLSX Ingestion (50,000 rows)',
      '7-Day Cloud File Retention',
      'Community & Standard Support',
    ],
  },
  PRO: {
    id: 'plan_pro',
    tier: 'PRO',
    name: 'Growth Pro',
    tagline: 'Predictive intelligence, cron schedules, and advanced business scans.',
    priceMonthly: { INR: 2999, USD: 39 },
    priceYearly: { INR: 2399, USD: 29 }, // ~20% discount
    razorpayPlanId: {
      monthly: 'plan_pro_monthly',
      yearly: 'plan_pro_yearly',
    },
    limits: {
      maxMembers: 15,
      maxAiCallsPerMonth: 250000,
      maxReportsPerMonth: 1000,
      maxImportsPerMonth: 50,
      maxIngestionRows: 500000,
      maxStorageMb: 5000,
      fileRetentionDays: 30,
    },
    features: [
      'Unlimited Workspaces',
      'Up to 15 Team Member Seats',
      '250,000 AI Tokens / mo (Gemini 3.6 Flash)',
      'Unlimited Cron PDF, XLSX & CSV Exports',
      '30-Day Cloud File Retention + Purger',
      'RFM Customer Segmentation & Churn Matrix',
      'Priority 24/7 Support',
    ],
  },
  ENTERPRISE: {
    id: 'plan_enterprise',
    tier: 'ENTERPRISE',
    name: 'Enterprise AI',
    tagline: 'Dedicated queue workers, custom retention, and high-volume ERP integrations.',
    priceMonthly: { INR: 8999, USD: 119 },
    priceYearly: { INR: 7199, USD: 95 },
    razorpayPlanId: {
      monthly: 'plan_enterprise_monthly',
      yearly: 'plan_enterprise_yearly',
    },
    limits: {
      maxMembers: 999999,
      maxAiCallsPerMonth: 1000000,
      maxReportsPerMonth: 999999,
      maxImportsPerMonth: 999999,
      maxIngestionRows: 10000000,
      maxStorageMb: 100000,
      fileRetentionDays: 90,
    },
    features: [
      'Unlimited Workspaces & Team Seats',
      '1,000,000+ AI Tokens / mo',
      'Dedicated BullMQ Isolated Queue Worker',
      'Unlimited Custom Report Formats',
      'Custom Retention (90+ Days / Permanent)',
      'Custom ERP API & Webhook Integrations',
      '99.9% Uptime SLA & Dedicated Account Lead',
    ],
  },
};

export const GATEWAY_CONFIG = {
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
    keySecret: env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || '',
    isConfigured: Boolean(
      (env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID) &&
      (env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET) &&
      !String(env.RAZORPAY_KEY_ID || '').includes('xxxx') &&
      !String(env.RAZORPAY_KEY_ID || '').includes('dev') &&
      !String(env.RAZORPAY_KEY_ID || '').includes('simulated')
    ),
  },
};

