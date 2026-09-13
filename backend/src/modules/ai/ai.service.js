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
    const qLower = userPrompt.toLowerCase().trim()
      .replace(/[^\w\s]/g, ' ') // strip punctuation
      .replace(/\s+/g, ' ')
      .trim();

    // ── Intent detection helpers ─────────────────────────────────
    const hasAny = (...words) => words.some((w) => qLower.includes(w));
    const isExact = (...words) => words.some((w) => qLower === w);
    const startsWith = (...words) => words.some((w) => qLower.startsWith(w));

    // ── Greeting intent (catches typos, short openers) ───────────
    const greetWords = [
      'hi', 'hii', 'hiii', 'hlw', 'hlo', 'hllo', 'hello', 'hey', 'heyy', 'heya',
      'howdy', 'hola', 'sup', 'yo', 'namaste', 'namaskar', 'greetings',
      'good morning', 'gm', 'good evening', 'good afternoon', 'good night',
      'whats up', 'wassup', 'watsup', 'how are you', 'how r u',
    ];
    const isGreeting = greetWords.some((g) => isExact(g) || startsWith(g + ' ') || qLower === g);

    // ── Capability / help intent ─────────────────────────────────
    const isCapability = hasAny('who are you', 'what can you do', 'what do you do',
      'help', 'assist', 'capabilities', 'features', 'what is decisionos', 'about you');

    // ── Thanks / acknowledgement ─────────────────────────────────
    const isThanks = hasAny('thank', 'thanks', 'thx', 'ty', 'great', 'nice',
      'awesome', 'cool', 'perfect', 'got it', 'ok', 'okay', 'k ');

    // ── Casual / off-topic (not business-related) ─────────────────
    const isOffTopic = !hasAny(
      'revenue', 'sale', 'earn', 'profit', 'income', 'money',
      'expense', 'cost', 'spend', 'budget', 'payment',
      'stock', 'inventory', 'reorder', 'sku', 'warehouse',
      'customer', 'client', 'buyer', 'churn',
      'report', 'pdf', 'export', 'import', 'upload', 'csv',
      'dashboard', 'insight', 'forecast', 'analytic',
      'team', 'member', 'role', 'plan', 'billing', 'subscription',
    );

    if (isGreeting) {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      answerText = `${timeGreet}! I'm **Atlas**, your DecisionOS executive assistant for **${ctx.organization.name}**. 🎯\n\nHere's what I can help you with:\n- **Live metrics** — revenue, expenses, inventory, customers\n- **Business insights** — trends, anomalies, forecasts\n- **Platform guidance** — importing data, generating reports, team setup\n\nWhat would you like to explore today?`;
      keyMetrics = {
        'Total Revenue': `₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}`,
        'Active Customers': ctx.customers.totalCount,
        'Inventory Items': ctx.inventory.totalItems,
      };
      suggestedFollowUps = [
        'What is our total revenue this month?',
        'Show inventory items low on stock',
        'How do I generate a report?',
      ];
    } else if (isThanks) {
      answerText = `You're welcome! 😊 Is there anything else you'd like to know about **${ctx.organization.name}**'s operations? I'm here anytime.`;
      keyMetrics = {};
      suggestedFollowUps = [
        'Show me the executive dashboard',
        'What is our current profit margin?',
        'Check for any alerts',
      ];
    } else if (isCapability) {
      answerText = `I'm **Atlas**, the business intelligence concierge for **${ctx.organization.name}**.\n\nI can help you with:\n- 📊 **Revenue & Sales** — daily velocity, top products, period comparisons\n- 💰 **Expenses** — category breakdowns, spike detection, month-over-month\n- 📦 **Inventory** — stock levels, reorder alerts, warehouse valuation\n- 👥 **Customers** — churn risk, top accounts, CLV analysis\n- 📄 **Reports** — generate PDF/XLSX/CSV, schedule automated dispatches\n- ⚙️ **Platform setup** — data import, team roles, organization settings`;
      keyMetrics = {
        'Inventory Items': ctx.inventory.totalItems,
        'Active Customers': ctx.customers.totalCount,
      };
      suggestedFollowUps = [
        'What is our sales performance this week?',
        'How do I import data?',
        'Show expense breakdown',
      ];
    } else if (hasAny('revenue', 'sale', 'earn', 'income', 'turnover')) {
      answerText = `Here's your revenue snapshot for **${ctx.organization.name}**:\n\n- **Total All-Time Revenue:** ₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}\n- **Last 30 Days:** ₹${ctx.summary.salesLast30Days.toLocaleString('en-IN')}\n- **Daily Velocity (7-day avg):** ₹${ctx.summary.dailySalesRunRate7d.toLocaleString('en-IN')}/day\n- **Total Orders:** ${ctx.summary.totalAllTimeSalesCount}`;
      keyMetrics = {
        'Total Revenue': `₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}`,
        '30-Day Sales': `₹${ctx.summary.salesLast30Days.toLocaleString('en-IN')}`,
        'Daily Run-Rate': `₹${ctx.summary.dailySalesRunRate7d.toLocaleString('en-IN')}/day`,
      };
      suggestedFollowUps = [
        'Which customer generated the highest revenue?',
        'Compare this month vs last month',
        'What is our 3-month revenue forecast?',
      ];
    } else if (hasAny('expense', 'cost', 'spend', 'spending', 'budget')) {
      const topCat = Object.entries(ctx.expenses.currentMonth).sort((a, b) => b[1] - a[1])[0];
      answerText = `**${ctx.organization.name}** expense summary:\n\n- **This Month Total:** ₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}\n${topCat ? `- **Top Category:** ${topCat[0]} — ₹${Number(topCat[1]).toLocaleString('en-IN')}` : '- No major expense spikes detected this month.'}`;
      keyMetrics = {
        'Monthly Expenses': `₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}`,
        'Top Category': topCat ? topCat[0] : 'N/A',
      };
      suggestedFollowUps = [
        'Break down expenses by every category',
        'Are there any expense spikes this month?',
        'What is our profit margin after expenses?',
      ];
    } else if (hasAny('profit', 'margin', 'p&l', 'gross profit', 'net profit')) {
      const rev = ctx.summary.salesLast30Days;
      const exp = ctx.expenses.currentMonthTotal;
      const gp = rev - exp;
      const margin = rev > 0 ? ((gp / rev) * 100).toFixed(1) : 0;
      answerText = `**P&L Snapshot for ${ctx.organization.name}** (last 30 days):\n\n- **Revenue:** ₹${rev.toLocaleString('en-IN')}\n- **Expenses:** ₹${exp.toLocaleString('en-IN')}\n- **Gross Profit:** ₹${gp.toLocaleString('en-IN')}\n- **Profit Margin:** ${margin}%`;
      keyMetrics = {
        'Gross Profit': `₹${gp.toLocaleString('en-IN')}`,
        'Profit Margin': `${margin}%`,
      };
      suggestedFollowUps = [
        'What expenses can we reduce?',
        'Show full revenue breakdown',
        'Generate a monthly P&L report',
      ];
    } else if (hasAny('stock', 'inventory', 'reorder', 'sku', 'warehouse', 'item')) {
      const lowStock = ctx.inventory.items.filter((i) => i.quantity <= i.reorderLevel);
      const outOfStock = ctx.inventory.items.filter((i) => i.quantity === 0);
      answerText = `**Inventory Status for ${ctx.organization.name}:**\n\n- **Total Items Tracked:** ${ctx.inventory.totalItems}\n- **Low Stock Alerts:** ${lowStock.length} item(s)\n- **Out of Stock:** ${outOfStock.length} item(s)\n${outOfStock.length > 0 ? `\n⚠️ Critical: **${outOfStock.slice(0, 3).map(i => i.name || i.sku).join(', ')}** are out of stock.` : '✅ No critical stockouts at this time.'}`;
      keyMetrics = {
        'Total Items': ctx.inventory.totalItems,
        'Low Stock': lowStock.length,
        'Out of Stock': outOfStock.length,
      };
      suggestedFollowUps = [
        'Which items need to be reordered now?',
        'What is our total inventory valuation?',
        'How do I import updated stock data?',
      ];
    } else if (hasAny('customer', 'client', 'buyer', 'churn', 'retention', 'account')) {
      const topCust = ctx.customers.topList[0];
      answerText = `**Customer Intelligence for ${ctx.organization.name}:**\n\n- **Total Active Accounts:** ${ctx.customers.totalCount}\n- **Top Customer:** ${topCust ? `${topCust.name} — ₹${Number(topCust.totalRevenue || 0).toLocaleString('en-IN')} lifetime revenue` : 'No customers yet'}\n- **Churn Risk:** Monitor accounts with no orders in the last 60+ days.`;
      keyMetrics = {
        'Total Accounts': ctx.customers.totalCount,
        'Top Customer': topCust ? topCust.name : 'N/A',
      };
      suggestedFollowUps = [
        'List top 5 customers by revenue',
        'Are any high-value customers at churn risk?',
        'Which customer segment is growing fastest?',
      ];
    } else if (hasAny('report', 'pdf', 'export', 'download', 'schedule')) {
      answerText = `To generate a business report in **DecisionOS**:\n\n1. Go to **Reports** in the left sidebar\n2. Select your report type (Daily, Weekly, Monthly)\n3. Choose your export format: **PDF**, **XLSX**, or **CSV**\n4. Click **Generate Report** — it downloads automatically to your device\n\nYou can also schedule automated reports to be emailed daily, weekly, or monthly.`;
      keyMetrics = {};
      suggestedFollowUps = [
        'How do I email a report automatically?',
        'What is included in the monthly report?',
        'Can I customize the report date range?',
      ];
    } else if (hasAny('import', 'upload', 'csv', 'excel', 'xlsx', 'spreadsheet')) {
      answerText = `To import your business data into **DecisionOS**:\n\n1. Go to **Data Import** in the sidebar\n2. Select the data type: Sales, Expenses, Inventory, or Customers\n3. Upload your **.CSV** or **.XLSX** file (up to 50MB)\n4. Confirm column mappings and click **Run Ingestion**\n\nSample templates are available on the import page for correct formatting.`;
      keyMetrics = {};
      suggestedFollowUps = [
        'What columns are required for sales data?',
        'Can I import multiple files at once?',
        'How long does import processing take?',
      ];
    } else if (hasAny('dashboard', 'overview', 'summary', 'snapshot', 'kpi')) {
      answerText = `Here's your live **Executive Dashboard** snapshot for **${ctx.organization.name}**:\n\n- **Total Revenue:** ₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}\n- **30-Day Sales:** ₹${ctx.summary.salesLast30Days.toLocaleString('en-IN')}\n- **Monthly Expenses:** ₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}\n- **Inventory Items:** ${ctx.inventory.totalItems} tracked\n- **Active Customers:** ${ctx.customers.totalCount} accounts`;
      keyMetrics = {
        'Total Revenue': `₹${ctx.summary.totalAllTimeRevenue.toLocaleString('en-IN')}`,
        'Expenses': `₹${ctx.expenses.currentMonthTotal.toLocaleString('en-IN')}`,
      };
      suggestedFollowUps = [
        'What drove revenue this month?',
        'Show expense category breakdown',
        'Which customers are at churn risk?',
      ];
    } else if (isOffTopic) {
      // Short, natural conversational reply for off-topic messages
      answerText = `I'm **Atlas**, your DecisionOS business intelligence assistant. I specialize in helping you analyze **${ctx.organization.name}**'s performance — revenue, expenses, inventory, customers, and reports.\n\nCould you ask me something about your business operations? For example:\n- *"What is our revenue this month?"*\n- *"Which inventory items are low in stock?"*\n- *"How do I generate a PDF report?"*`;
      keyMetrics = {};
      suggestedFollowUps = [
        'What is our total revenue?',
        'Show low stock alerts',
        'How do I import data?',
      ];
    } else {
      // Generic business snapshot fallback
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
