// src/lib/forecaster.js
// ============================================================
// Predictive Revenue Forecaster (Linear & Trend Analysis)
// Generates forward projections for DecisionOS dashboard & reports
// ============================================================

/**
 * Computes linear regression slope (m) and intercept (b)
 * x = [0, 1, 2, ...], y = [revenue_0, revenue_1, ...]
 */
function linearRegression(dataPoints) {
  const n = dataPoints.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: dataPoints[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = dataPoints[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = (n * sumXX - sumX * sumX);
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Generate 6-month historical + 1-3 month predictive revenue forecast
 * @param {Array<{ monthKey: string, label: string, revenue: number }>} historicalBuckets
 * @param {number} [monthsForward=3]
 */
export function generateRevenueForecast(historicalBuckets, monthsForward = 3) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  const historicalRevenues = historicalBuckets.map((b) => b.revenue);
  const { slope, intercept } = linearRegression(historicalRevenues);

  const series = [];

  // 1. Historical Actual Points
  historicalBuckets.forEach((bucket, idx) => {
    // Target is slightly above trend
    const trendValue = Math.max(0, Math.round(slope * idx + intercept));
    const target = Math.round(trendValue * 1.08);

    series.push({
      month: bucket.label.split(' ')[0], // e.g. 'Jan'
      monthFull: bucket.label,
      revenue: bucket.revenue,
      target,
      type: 'actual',
    });
  });

  // 2. Forward Predictive Points
  const lastIndex = historicalBuckets.length - 1;
  const lastRevenue = historicalRevenues[lastIndex] || 100000;

  for (let i = 1; i <= monthsForward; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mName = monthNames[futureDate.getMonth()];
    const y = futureDate.getFullYear();

    // Projected revenue using trend slope + baseline momentum
    const rawProjected = Math.round(slope * (lastIndex + i) + intercept);
    // Ensure projection does not drop below 50% of last revenue or go negative
    const projectedRevenue = Math.max(Math.round(lastRevenue * 0.8), rawProjected > 0 ? rawProjected : Math.round(lastRevenue * 1.05));
    const target = Math.round(projectedRevenue * 1.10);

    series.push({
      month: `${mName} (P)`,
      monthFull: `${mName} ${y} (Predicted)`,
      revenue: projectedRevenue,
      target,
      type: 'predicted',
      confidenceScore: Number((Math.max(0.70, 0.95 - (i * 0.08))).toFixed(2)),
    });
  }

  return {
    trendDirection: slope >= 0 ? 'GROWING' : 'DECLINING',
    monthlyGrowthRate: Number((slope).toFixed(2)),
    forecast: series,
  };
}
