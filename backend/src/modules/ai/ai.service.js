// src/modules/ai/ai.service.js
// ============================================================
// DecisionOS AI Engine Business Logic
// Powered by Google Gemini 1.5 Flash & Statistical Anomaly Models
// ============================================================

import { prisma } from '../../lib/prisma.js';
import { callGeminiFlash, isGeminiConfigured } from '../../config/gemini.js';
import { buildOrgAiContext } from '../../lib/aiContextBuilder.js';
import { runAllStatisticalDetectors } from '../../lib/anomalyDetector.js';
import { generateRevenueForecast } from '../../lib/forecaster.js';
import { checkAiCallLimit } from '../../lib/planLimits.js';
import { parsePagination, formatPaginationMeta } from '../../lib/pagination.js';
import { logAudit } from '../../lib/audit.js';

// Normalizes backend InsightType to frontend UI type
function mapTypeToUi(type) {
  switch (type) {
    case 'REVENUE_ANOMALY':
    case 'SALES_TREND':
      return 'sales';
    case 'EXPENSE_SPIKE':
      return 'expense';
    case 'INVENTORY_STOCKOUT':
      return 'inventory';
    case 'CHURN_RISK':
    case 'CUSTOMER_OPPORTUNITY':
      return 'churn';
    default:
      return 'info';
  }
}

// Normalizes backend InsightSeverity to frontend UI severity
function mapSeverityToUi(severity) {
  switch (severity) {
    case 'CRITICAL': return 'critical';
    case 'WARNING':  return 'warning';
    case 'INFO':     return 'info';
    case 'GOOD':     return 'success';
    default:         return 'info';
  }
}

// Map frontend UI severity filter to backend Prisma enum
function mapUiSeverityToEnum(sev) {
  const s = String(sev || '').toUpperCase();
  if (s === 'SUCCESS') return 'GOOD';
  if (['CRITICAL', 'WARNING', 'INFO', 'GOOD'].includes(s)) return s;
  return undefined;
}

// Map frontend UI type filter to backend Prisma enum
function mapUiTypeToEnum(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'sales') return ['REVENUE_ANOMALY', 'SALES_TREND'];
  if (t === 'expense') return ['EXPENSE_SPIKE'];
  if (t === 'inventory') return ['INVENTORY_STOCKOUT'];
  if (t === 'churn') return ['CHURN_RISK', 'CUSTOMER_OPPORTUNITY'];
  return undefined;
}

// ── 1. GENERATE / REFRESH ALL INSIGHTS ─────────────────────────
export async function generateOrgInsightsService(orgId, userId) {
  // 1. Build comprehensive context
  const context = await buildOrgAiContext(orgId);

  // 2. Run pure statistical heuristic anomaly detectors
  const detectedInsights = runAllStatisticalDetectors(context);

  // 3. If Gemini 1.5 Flash is configured, enhance with executive synthesis
  let geminiSynthesis = null;
  if (isGeminiConfigured()) {
    try {
      const prompt = `Analyze this business performance context and generate 2 high-level strategic executive observations in JSON format.
Context:
- All-Time Revenue: ₹${context.summary.totalAllTimeRevenue}
- 30-Day Sales: ₹${context.summary.salesLast30Days} (Run-rate: ₹${context.summary.dailySalesRunRate30d}/day)
- 7-Day Sales: ₹${context.summary.salesLast7Days} (Run-rate: ₹${context.summary.dailySalesRunRate7d}/day)
- Current Month Expenses: ₹${context.expenses.currentMonthTotal}
- Total Inventory Items: ${context.inventory.totalItems}
- Top Customers Count: ${context.customers.totalCount}

Return JSON with structure:
{
  "insights": [
    {
      "type": "SALES_TREND" | "GENERAL" | "CUSTOMER_OPPORTUNITY",
      "severity": "GOOD" | "INFO" | "WARNING",
      "title": "Short punchy title",
      "summary": "1-2 sentence executive observation.",
      "action": "Recommended leadership action"
    }
  ]
}`;

      const geminiResult = await callGeminiFlash(prompt, '', { temperature: 0.3 });
      if (geminiResult.available && geminiResult.text) {
        try {
          const parsed = JSON.parse(geminiResult.text);
          if (Array.isArray(parsed.insights)) {
            geminiSynthesis = parsed.insights;
          }
        } catch { /* ignore JSON parse error */ }

        // Track token usage
        await prisma.aiUsage.create({
          data: {
            organizationId: orgId,
            userId,
            feature: 'INSIGHTS_GENERATION',
            tokensUsed: geminiResult.tokensUsed || 300,
            costCents: 1,
            provider: 'google',
            model: 'gemini-1.5-flash',
          },
        });
      }
    } catch (err) {
      console.warn('[AI Service] Gemini synthesis skipped:', err.message);
    }
  }

  // Combine statistical and AI insights
  const allInsightsToSave = [...detectedInsights];
  if (geminiSynthesis) {
    geminiSynthesis.forEach((g) => {
      allInsightsToSave.push({
        type: g.type || 'GENERAL',
        severity: g.severity || 'INFO',
        title: g.title,
        summary: g.summary,
        details: { source: 'gemini-1.5-flash' },
        affectedEntity: 'Executive Strategy',
        confidence: 0.90,
        action: g.action || 'View Detailed Metrics',
      });
    });
  }

  // Fallback default insight if no records exist
  if (allInsightsToSave.length === 0) {
    allInsightsToSave.push({
      type: 'GENERAL',
      severity: 'INFO',
      title: 'Operations Baseline Normal',
      summary: 'All monitored sales, expenses, and inventory metrics are operating within normal expected parameters.',
      details: { status: 'NORMAL' },
      affectedEntity: 'General Operations',
      confidence: 1.0,
      action: 'View Dashboard Analytics',
    });
  }

  // Clear previous undismissed insights and bulk insert fresh ones
  await prisma.aiInsight.deleteMany({
    where: { organizationId: orgId, isDismissed: false },
  });

  const createdInsights = await Promise.all(
    allInsightsToSave.map((item) =>
      prisma.aiInsight.create({
        data: {
          organizationId: orgId,
          type: item.type,
          severity: item.severity,
          title: item.title,
          summary: item.summary,
          details: {
            ...(item.details || {}),
            action: item.action || 'View Analytics',
          },
          affectedEntity: item.affectedEntity || null,
          confidence: item.confidence || 0.85,
        },
      })
    )
  );

  await logAudit({
    action: 'AI_RUN',
    userId,
    orgId,
    entityType: 'AiInsight',
    metadata: { generatedCount: createdInsights.length },
  });

  return {
    insightsCount: createdInsights.length,
    insights: createdInsights.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.summary,
      type: mapTypeToUi(i.type),
      severity: mapSeverityToUi(i.severity),
      rawType: i.type,
      rawSeverity: i.severity,
      meta: `Generated just now · Confidence: ${Math.round((i.confidence || 0.85) * 100)}%`,
      action: (i.details && typeof i.details === 'object' && i.details.action) || 'Take Action',
      isRead: i.isRead,
      isDismissed: i.isDismissed,
      generatedAt: i.generatedAt,
    })),
  };
}

// ── 2. LIST INSIGHTS (Filtered & Paginated) ────────────────────
export async function listInsightsService(orgId, query) {
  const { page, limit, skip, take, orderBy } = parsePagination(query, {
    defaultSortBy: 'generatedAt',
    defaultSortOrder: 'desc',
  });

  const enumSeverity = mapUiSeverityToEnum(query.severity);
  const enumTypes = mapUiTypeToEnum(query.type);

  const where = {
    organizationId: orgId,
    ...(query.isDismissed !== undefined
      ? { isDismissed: query.isDismissed === 'true' }
      : { isDismissed: false }),
    ...(query.isRead !== undefined ? { isRead: query.isRead === 'true' } : {}),
    ...(enumSeverity ? { severity: enumSeverity } : {}),
    ...(enumTypes ? { type: { in: enumTypes } } : {}),
  };

  const [rawInsights, total] = await Promise.all([
    prisma.aiInsight.findMany({
      where,
      skip,
      take,
      orderBy: orderBy || { generatedAt: 'desc' },
    }),
    prisma.aiInsight.count({ where }),
  ]);

  // If DB has 0 insights, generate initial set automatically
  if (total === 0 && !query.severity && (!query.type || query.type === 'all')) {
    const fresh = await generateOrgInsightsService(orgId, null);
    return {
      insights: fresh.insights,
      meta: formatPaginationMeta(fresh.insights.length, 1, 20),
    };
  }

  const formatted = rawInsights.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.summary,
    type: mapTypeToUi(i.type),
    severity: mapSeverityToUi(i.severity),
    rawType: i.type,
    rawSeverity: i.severity,
    meta: `Confidence: ${Math.round((i.confidence || 0.85) * 100)}%`,
    action: (i.details && typeof i.details === 'object' && i.details.action) || 'Take Action',
    isRead: i.isRead,
    isDismissed: i.isDismissed,
    generatedAt: i.generatedAt,
  }));

  return {
    insights: formatted,
    meta: formatPaginationMeta(total, page, limit),
  };
}

// ── 3. GET INSIGHTS SUMMARY (Badge Counts & Health Score) ──────
export async function getInsightsSummaryService(orgId) {
  const activeInsights = await prisma.aiInsight.findMany({
    where: { organizationId: orgId, isDismissed: false },
    select: { severity: true, isRead: true },
  });

  const counts = {
    critical: 0,
    warning: 0,
    info: 0,
    success: 0,
    total: activeInsights.length,
    unread: activeInsights.filter((i) => !i.isRead).length,
  };

  activeInsights.forEach((i) => {
    if (i.severity === 'CRITICAL') counts.critical++;
    else if (i.severity === 'WARNING') counts.warning++;
    else if (i.severity === 'INFO') counts.info++;
    else if (i.severity === 'GOOD') counts.success++;
  });

  // Calculate Health Score (100 - (critical * 20) - (warning * 8))
  const healthPenalty = (counts.critical * 20) + (counts.warning * 8);
  const healthScore = Math.max(25, Math.min(100, 100 - healthPenalty));

  return {
    counts,
    healthScore,
    healthStatus: healthScore >= 80 ? 'EXCELLENT' : healthScore >= 60 ? 'STABLE' : 'ATTENTION_REQUIRED',
  };
}

// ── 4. MARK INSIGHT AS READ ────────────────────────────────────
export async function markInsightReadService(orgId, insightId) {
  const insight = await prisma.aiInsight.findFirst({
    where: { id: insightId, organizationId: orgId },
  });
  if (!insight) return { notFound: true };

  const updated = await prisma.aiInsight.update({
    where: { id: insightId },
    data: { isRead: true },
  });
  return { insight: updated };
}

// ── 5. DISMISS INSIGHT ─────────────────────────────────────────
export async function dismissInsightService(orgId, insightId) {
  const insight = await prisma.aiInsight.findFirst({
    where: { id: insightId, organizationId: orgId },
  });
  if (!insight) return { notFound: true };

  const updated = await prisma.aiInsight.update({
    where: { id: insightId },
    data: { isDismissed: true },
  });
  return { insight: updated };
}

// ── 6. ASK DECISIONOS (NATURAL LANGUAGE BUSINESS ANALYST) ───────
export async function askDecisionOsService(orgId, userId, userPrompt) {
  // 1. Enforce monthly plan limits
  const quota = await checkAiCallLimit(orgId);
  if (!quota.allowed) {
    return {
      limitReached: true,
      current: quota.current,
      max: quota.max,
      tier: quota.tier,
    };
  }

  // 2. Build live org context
  const ctx = await buildOrgAiContext(orgId);

  let answerText = '';
  let keyMetrics = {};
  let suggestedFollowUps = [];

  if (isGeminiConfigured()) {
    const systemPrompt = `You are DecisionOS AI, a Chief Financial and Operations Officer assistant.
Answer the executive's question directly, accurately, and concisely using the provided live business metrics.
Format your answer in professional markdown with bullet points where appropriate.

Live Organization Data (${ctx.organization.name}):
- Total All-Time Revenue: ₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}
- Sales in Last 30 Days: ₹${ctx.summary.salesLast30Days.toLocaleString('en-IN')} (${ctx.summary.totalAllTimeSalesCount} orders total)
- Daily Sales Velocity (7-Day Average): ₹${ctx.summary.dailySalesRunRate7d.toLocaleString('en-IN')}/day
- Current Month Expenses: ₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}
- Expense Categories Breakdown: ${JSON.stringify(ctx.expenses.currentMonth)}
- Inventory Items Monitored: ${ctx.inventory.totalItems}
- Top Customers: ${ctx.customers.topList.map((c) => `${c.name} (₹${c.totalRevenue})`).slice(0, 5).join(', ')}

Return JSON with structure:
{
  "answer": "Concise direct markdown answer answering the user prompt",
  "keyMetrics": { "metric1": "value", "metric2": "value" },
  "suggestedFollowUps": ["Question 1?", "Question 2?", "Question 3?"]
}`;

    const geminiResult = await callGeminiFlash(userPrompt, systemPrompt, { temperature: 0.2 });

    if (geminiResult.available && geminiResult.text) {
      try {
        const parsed = JSON.parse(geminiResult.text);
        answerText = parsed.answer || geminiResult.text;
        keyMetrics = parsed.keyMetrics || {};
        suggestedFollowUps = parsed.suggestedFollowUps || [];
      } catch {
        answerText = geminiResult.text;
      }

      await prisma.aiUsage.create({
        data: {
          organizationId: orgId,
          userId,
          feature: 'ASK_DECISION_OS',
          tokensUsed: geminiResult.tokensUsed || 250,
          costCents: 1,
          provider: 'google',
          model: 'gemini-1.5-flash',
        },
      });
    }
  }

  // Fallback intelligent answer engine if Gemini is not configured or fails
  if (!answerText) {
    const qLower = userPrompt.toLowerCase();
    
    if (qLower.includes('revenue') || qLower.includes('sale') || qLower.includes('earning')) {
      answerText = `Based on your recent transactions, **Total Revenue is ₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}** across ${ctx.summary.totalAllTimeSalesCount} orders. Over the last 30 days, your business generated **₹${ctx.summary.salesLast30Days.toLocaleString('en-IN')}**, running at an average velocity of **₹${ctx.summary.dailySalesRunRate7d.toLocaleString('en-IN')}/day** this week.`;
      keyMetrics = {
        'Total Revenue': `₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}`,
        '30-Day Sales': `₹${ctx.summary.salesLast30Days.toLocaleString('en-IN')}`,
        'Daily Run-Rate': `₹${ctx.summary.dailySalesRunRate7d.toLocaleString('en-IN')}/day`,
      };
      suggestedFollowUps = [
        'How does this compare to our revenue targets?',
        'Which customer generated the highest revenue?',
        'What is our 3-month revenue prediction?',
      ];
    } else if (qLower.includes('expense') || qLower.includes('cost') || qLower.includes('spend')) {
      const topCat = Object.entries(ctx.expenses.currentMonth).sort((a, b) => b[1] - a[1])[0];
      answerText = `Current month total expenses stand at **₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}**. ${topCat ? `Your highest expense category is **${topCat[0]}** at ₹${topCat[1].toLocaleString('en-IN')}.` : 'No major expense spikes detected.'}`;
      keyMetrics = {
        'Monthly Expenses': `₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}`,
        'Top Category': topCat ? topCat[0] : 'N/A',
      };
      suggestedFollowUps = [
        'Break down expenses by category',
        'Are there any expense spikes this month?',
        'How can we reduce logistics costs?',
      ];
    } else if (qLower.includes('stock') || qLower.includes('inventory') || qLower.includes('reorder')) {
      const lowStock = ctx.inventory.items.filter((i) => i.quantity <= i.reorderLevel);
      answerText = `You currently track **${ctx.inventory.totalItems} inventory items**. There are **${lowStock.length} items** currently at or below their reorder thresholds.`;
      keyMetrics = {
        'Total Items': ctx.inventory.totalItems,
        'Low Stock Alerts': lowStock.length,
      };
      suggestedFollowUps = [
        'Which items are critically low in stock?',
        'What is our total inventory valuation?',
        'When should I place the next purchase order?',
      ];
    } else if (qLower.includes('customer') || qLower.includes('client') || qLower.includes('churn')) {
      const topCust = ctx.customers.topList[0];
      answerText = `You currently have **${ctx.customers.totalCount} active customer accounts**. Your top spending customer is **${topCust ? topCust.name : 'N/A'}** with a lifetime revenue of ₹${Number(topCust?.totalRevenue || 0).toLocaleString('en-IN')}.`;
      keyMetrics = {
        'Total Accounts': ctx.customers.totalCount,
        'Top Customer': topCust ? topCust.name : 'N/A',
      };
      suggestedFollowUps = [
        'Are any high-value customers at risk of churn?',
        'Which customer segment has the highest growth?',
        'List top 5 customers by revenue',
      ];
    } else {
      answerText = `Here is your current operational snapshot for **${ctx.organization.name}**:\n\n- **Total Revenue:** ₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}\n- **Monthly Expenses:** ₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}\n- **Inventory Items:** ${ctx.inventory.totalItems} tracked\n- **Active Customers:** ${ctx.customers.totalCount} accounts`;
      keyMetrics = {
        'Total Revenue': `₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}`,
        'Expenses': `₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}`,
      };
      suggestedFollowUps = [
        'What are our top revenue opportunities?',
        'Show inventory stockout alerts',
        'Summarize financial performance',
      ];
    }
  }

  return {
    query: userPrompt,
    answer: answerText,
    keyMetrics,
    suggestedFollowUps,
    timestamp: new Date().toISOString(),
  };
}

// ── 7. PREDICTIVE REVENUE FORECAST (1–3 Months) ────────────────
export async function getRevenueForecastService(orgId, monthsForward = 3) {
  const ctx = await buildOrgAiContext(orgId);
  const forecast = generateRevenueForecast(ctx.monthlySalesBuckets, monthsForward);
  return forecast;
}

// ── 8. AI USAGE STATS ──────────────────────────────────────────
export async function getAiUsageStatsService(orgId) {
  const planCheck = await checkAiCallLimit(orgId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageLogs = await prisma.aiUsage.findMany({
    where: { organizationId: orgId, createdAt: { gte: startOfMonth } },
    select: { feature: true, tokensUsed: true, createdAt: true },
  });

  const totalTokens = usageLogs.reduce((sum, u) => sum + u.tokensUsed, 0);

  return {
    callsUsedThisMonth: planCheck.current,
    maxCallsAllowed: planCheck.max,
    remainingCalls: Math.max(0, planCheck.max - planCheck.current),
    totalTokensUsed: totalTokens,
    tier: planCheck.tier,
    resetDate: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString(),
  };
}
