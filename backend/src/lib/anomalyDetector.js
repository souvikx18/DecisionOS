// src/lib/anomalyDetector.js
// ============================================================
// Statistical & Heuristic Anomaly Detectors
// Powers DecisionOS Anomaly Detection & Proactive Alert Engine
// ============================================================

/**
 * 1. REVENUE ANOMALIES & VELOCITY DROPS
 */
export function detectRevenueAnomalies(ctx) {
  const insights = [];
  const { dailySalesRunRate7d, dailySalesRunRate30d, salesLast30Days, salesLast7Days } = ctx.summary;

  // If there is meaningful historical baseline
  if (salesLast30Days > 5000 && dailySalesRunRate30d > 0) {
    const percentageDrop = ((dailySalesRunRate30d - dailySalesRunRate7d) / dailySalesRunRate30d) * 100;

    if (percentageDrop >= 35) {
      insights.push({
        type: 'REVENUE_ANOMALY',
        severity: 'CRITICAL',
        title: 'Severe Sales Velocity Contraction',
        summary: `7-day sales run rate has dropped by ${percentageDrop.toFixed(1)}% compared to the 30-day average (₹${dailySalesRunRate7d.toLocaleString('en-IN')}/day vs ₹${dailySalesRunRate30d.toLocaleString('en-IN')}/day).`,
        details: {
          metric: 'sales_velocity',
          dropPercent: Number(percentageDrop.toFixed(1)),
          dailyRunRate7d: dailySalesRunRate7d,
          dailyRunRate30d: dailySalesRunRate30d,
        },
        affectedEntity: 'Sales Operations',
        confidence: 0.92,
        action: 'Review Marketing & Sales Funnel',
      });
    } else if (percentageDrop >= 20) {
      insights.push({
        type: 'REVENUE_ANOMALY',
        severity: 'WARNING',
        title: 'Sales Velocity Softening',
        summary: `Recent 7-day sales volume is running ${percentageDrop.toFixed(1)}% below normal baseline.`,
        details: {
          metric: 'sales_velocity',
          dropPercent: Number(percentageDrop.toFixed(1)),
        },
        affectedEntity: 'Sales Operations',
        confidence: 0.85,
        action: 'Inspect Conversion Rates',
      });
    } else if (percentageDrop <= -20) {
      // Sales Surge
      const surgePercent = Math.abs(percentageDrop);
      insights.push({
        type: 'SALES_TREND',
        severity: 'GOOD',
        title: 'Strong Sales Acceleration',
        summary: `Sales velocity is surging ${surgePercent.toFixed(1)}% above the 30-day baseline (₹${dailySalesRunRate7d.toLocaleString('en-IN')}/day).`,
        details: {
          metric: 'sales_velocity',
          growthPercent: Number(surgePercent.toFixed(1)),
        },
        affectedEntity: 'Sales Operations',
        confidence: 0.95,
        action: 'Ensure Supply Fulfillment Capacity',
      });
    }
  }

  return insights;
}

/**
 * 2. EXPENSE SPIKES & CATEGORY SURGES
 */
export function detectExpenseSpikes(ctx) {
  const insights = [];
  const currentExp = ctx.expenses.currentMonth;
  const prevExp = ctx.expenses.prevMonth;

  for (const [category, currentAmount] of Object.entries(currentExp)) {
    const prevAmount = prevExp[category] || 0;

    // Surge condition: Amount > ₹10,000 AND (prevAmount == 0 OR growth >= 25%)
    if (currentAmount >= 10000) {
      let growthPercent = 0;
      if (prevAmount > 0) {
        growthPercent = ((currentAmount - prevAmount) / prevAmount) * 100;
      } else {
        growthPercent = 100; // New large expense category
      }

      if (growthPercent >= 40) {
        // Find top vendor in this category
        const vendorMap = {};
        ctx.expenses.rawCurrent
          .filter((e) => e.category === category)
          .forEach((e) => {
            if (e.vendor) vendorMap[e.vendor] = (vendorMap[e.vendor] || 0) + Number(e.amount);
          });
        const topVendor = Object.entries(vendorMap).sort((a, b) => b[1] - a[1])[0]?.[0];

        insights.push({
          type: 'EXPENSE_SPIKE',
          severity: 'WARNING',
          title: `Unusual Spike in ${category} Expenses`,
          summary: `${category} spending is up ${growthPercent.toFixed(1)}% this month (₹${currentAmount.toLocaleString('en-IN')} vs ₹${prevAmount.toLocaleString('en-IN')}).${topVendor ? ` Major payee: ${topVendor}.` : ''}`,
          details: {
            category,
            currentAmount,
            prevAmount,
            growthPercent: Number(growthPercent.toFixed(1)),
            topVendor: topVendor || null,
          },
          affectedEntity: category,
          confidence: 0.88,
          action: 'Audit Expense Invoices',
        });
      }
    }
  }

  return insights;
}

/**
 * 3. INVENTORY DEPLETION & STOCKOUT RISK
 */
export function detectInventoryStockouts(ctx) {
  const insights = [];
  const items = ctx.inventory.items;
  const velocity = ctx.inventory.productVelocity;

  items.forEach((item) => {
    // Check basic reorder level
    const isBelowReorder = item.quantity <= item.reorderLevel;

    // Calculate velocity-based depletion days if linked to a product
    let daysToDepletion = null;
    if (item.productId && velocity[item.productId]) {
      const unitsPerDay = velocity[item.productId] / 30;
      if (unitsPerDay > 0) {
        daysToDepletion = Number((item.quantity / unitsPerDay).toFixed(1));
      }
    }

    if (item.quantity === 0) {
      insights.push({
        type: 'INVENTORY_STOCKOUT',
        severity: 'CRITICAL',
        title: `Out of Stock: ${item.name}`,
        summary: `Stock for ${item.name} is completely exhausted (0 units on hand). Potential revenue loss imminent.`,
        details: {
          itemName: item.name,
          sku: item.sku,
          quantity: 0,
          reorderQty: item.reorderQty || 50,
          warehouseLocation: item.warehouseLocation,
        },
        affectedEntity: item.name,
        confidence: 1.0,
        action: 'Issue Emergency Restock Order',
      });
    } else if (daysToDepletion !== null && daysToDepletion <= 7) {
      insights.push({
        type: 'INVENTORY_STOCKOUT',
        severity: 'CRITICAL',
        title: `Stock Depletion in ${daysToDepletion} Days: ${item.name}`,
        summary: `At current sales velocity, ${item.name} stock (${item.quantity} units) will run out in ~${daysToDepletion} days.`,
        details: {
          itemName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          daysToDepletion,
          reorderQty: item.reorderQty,
        },
        affectedEntity: item.name,
        confidence: 0.91,
        action: 'Create Purchase Order',
      });
    } else if (isBelowReorder) {
      insights.push({
        type: 'INVENTORY_STOCKOUT',
        severity: 'WARNING',
        title: `Low Stock Alert: ${item.name}`,
        summary: `Current stock (${item.quantity} units) has fallen below reorder threshold (${item.reorderLevel} units).`,
        details: {
          itemName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          reorderLevel: item.reorderLevel,
          reorderQty: item.reorderQty,
        },
        affectedEntity: item.name,
        confidence: 0.89,
        action: 'Reorder Inventory',
      });
    }
  });

  return insights;
}

/**
 * 4. CUSTOMER CHURN & HEALTH RISKS
 */
export function detectCustomerChurnRisks(ctx) {
  const insights = [];
  const now = new Date();
  const topCustomers = ctx.customers.topList;

  topCustomers.forEach((cust) => {
    if (!cust.lastOrderAt) return;
    const daysSinceOrder = Math.floor((now.getTime() - new Date(cust.lastOrderAt).getTime()) / (24 * 60 * 60 * 1000));
    const revenue = Number(cust.totalRevenue || 0);

    // High value customer (> ₹50,000) dormant for > 45 days
    if (revenue >= 50000 && daysSinceOrder >= 45) {
      insights.push({
        type: 'CHURN_RISK',
        severity: 'WARNING',
        title: `High-Value Account Inactive: ${cust.name}`,
        summary: `${cust.name} (Lifetime Spend: ₹${revenue.toLocaleString('en-IN')}) has not placed an order in ${daysSinceOrder} days.`,
        details: {
          customerId: cust.id,
          customerName: cust.name,
          company: cust.company,
          totalRevenue: revenue,
          daysSinceOrder,
        },
        affectedEntity: cust.name,
        confidence: 0.84,
        action: 'Schedule Account Manager Follow-up',
      });
    }
  });

  return insights;
}

/**
 * 5. HIGH POTENTIAL SEGMENT OPPORTUNITIES
 */
export function detectCustomerOpportunities(ctx) {
  const insights = [];
  const customers = ctx.customers.topList;

  // Group active customers by segment
  const segmentCounts = {};
  customers.forEach((c) => {
    if (c.segment) {
      segmentCounts[c.segment] = (segmentCounts[c.segment] || 0) + 1;
    }
  });

  for (const [segment, count] of Object.entries(segmentCounts)) {
    if (count >= 3) {
      insights.push({
        type: 'CUSTOMER_OPPORTUNITY',
        severity: 'INFO',
        title: `High-Density Segment: ${segment}`,
        summary: `You have ${count} key accounts in the "${segment}" tier. Suggest tailored expansion incentives.`,
        details: { segment, customerCount: count },
        affectedEntity: segment,
        confidence: 0.78,
        action: 'Launch Segment Campaign',
      });
      break; // One opportunity insight per scan
    }
  }

  return insights;
}

/**
 * Run all statistical anomaly detectors together
 */
export function runAllStatisticalDetectors(ctx) {
  return [
    ...detectRevenueAnomalies(ctx),
    ...detectExpenseSpikes(ctx),
    ...detectInventoryStockouts(ctx),
    ...detectCustomerChurnRisks(ctx),
    ...detectCustomerOpportunities(ctx),
  ];
}
