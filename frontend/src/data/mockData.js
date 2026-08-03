// ── Mock Data for Frontend-First Development ──────────────────────
// Replace API calls with real endpoints in Phase 2

export const mockRevenue = {
  total: '₹48,32,500',
  change: '+12.4',
  changeLabel: 'vs last month (₹43,00,200)',
}

export const mockSales = {
  total: '1,284',
  change: '+8.1',
  changeLabel: '1,188 last month',
}

export const mockExpenses = {
  total: '₹12,75,000',
  change: '-3.2',
  changeLabel: 'vs last month (₹13,17,400)',
}

export const mockInventoryAlerts = {
  total: '7',
  change: null,
  changeLabel: 'Items below reorder level',
}

export const mockSalesTrend = [
  { month: 'Feb', revenue: 3200000, target: 3500000 },
  { month: 'Mar', revenue: 3800000, target: 3500000 },
  { month: 'Apr', revenue: 3500000, target: 3700000 },
  { month: 'May', revenue: 4100000, target: 3800000 },
  { month: 'Jun', revenue: 3900000, target: 4000000 },
  { month: 'Jul', revenue: 4832500, target: 4500000 },
]

export const mockExpenseTrend = [
  { month: 'Feb', logistics: 280000, salaries: 650000, marketing: 120000, operations: 200000 },
  { month: 'Mar', logistics: 310000, salaries: 650000, marketing: 145000, operations: 220000 },
  { month: 'Apr', logistics: 295000, salaries: 670000, marketing: 130000, operations: 210000 },
  { month: 'May', logistics: 340000, salaries: 670000, marketing: 160000, operations: 235000 },
  { month: 'Jun', logistics: 328000, salaries: 690000, marketing: 155000, operations: 244000 },
  { month: 'Jul', logistics: 358000, salaries: 690000, marketing: 165000, operations: 262000 },
]

export const mockTopCustomers = [
  { rank: 1, name: 'Reliance Retail Ltd',   revenue: 840000, orders: 42, change: +18.2 },
  { rank: 2, name: 'Tata Consumer Products',revenue: 620000, orders: 31, change: +5.7  },
  { rank: 3, name: 'Mahindra Agri Solutions',revenue: 510000, orders: 26, change: -2.1 },
  { rank: 4, name: 'ITC Limited',            revenue: 470000, orders: 24, change: +11.3 },
  { rank: 5, name: 'Hindustan Unilever',     revenue: 380000, orders: 19, change: +3.8  },
]

export const mockInventoryStatus = [
  { name: 'Industrial Bearings 6205',  stock: 24,  reorder: 50,  daysLeft: 5,  status: 'critical' },
  { name: 'Hydraulic Oil 68L',         stock: 38,  reorder: 100, daysLeft: 7,  status: 'critical' },
  { name: 'Carbon Steel Sheets 2mm',   stock: 120, reorder: 200, daysLeft: 14, status: 'warning' },
  { name: 'Rubber Gaskets (Pack 100)', stock: 60,  reorder: 80,  daysLeft: 18, status: 'warning' },
  { name: 'Stainless Steel Bolts M10', stock: 440, reorder: 200, daysLeft: 42, status: 'ok' },
  { name: 'Electric Motor 5HP',        stock: 12,  reorder: 20,  daysLeft: 30, status: 'ok' },
]

export const mockAIInsights = [
  {
    id: 1, type: 'sales', severity: 'critical',
    title: 'Sales Drop Detected in Product Category',
    description: 'Industrial Bearings 6205 sold 30% less this week (42 units vs 60 avg). Primary drop in Mumbai and Pune regions.',
    meta: 'Generated 2 hours ago · Confidence: 94%',
    action: 'View Sales Detail',
  },
  {
    id: 2, type: 'churn', severity: 'warning',
    title: 'High-Value Customer At Risk',
    description: 'Mahindra Agri Solutions hasn\'t purchased in 45 days. Avg purchase cycle is 28 days. Predicted churn risk: HIGH.',
    meta: 'Generated 4 hours ago · Account value: ₹5,10,000/yr',
    action: 'Send Re-engagement',
  },
  {
    id: 3, type: 'inventory', severity: 'critical',
    title: 'Critical Stock Depletion Alert',
    description: 'Stock for Hydraulic Oil 68L will be exhausted in approximately 7 days at current consumption rate.',
    meta: 'Generated 1 hour ago · Current stock: 38 units',
    action: 'Create Purchase Order',
  },
  {
    id: 4, type: 'expense', severity: 'warning',
    title: 'Logistics Expense Spike',
    description: 'Logistics category is 22% above last month\'s average (₹3,58,000 vs ₹2,93,000). Recommend reviewing freight contracts.',
    meta: 'Generated 6 hours ago',
    action: 'View Breakdown',
  },
  {
    id: 5, type: 'sales', severity: 'success',
    title: 'Revenue Target Exceeded',
    description: 'July revenue (₹48.3L) has exceeded the monthly target (₹45L) by 7.4%. Strongest month in 2026.',
    meta: 'Generated 30 min ago',
    action: 'Download Report',
  },
  {
    id: 6, type: 'churn', severity: 'info',
    title: 'New High-Potential Segment Identified',
    description: '3 customers from the pharma sector have placed repeat orders in the last 30 days. Suggest a targeted outreach campaign.',
    meta: 'Generated 8 hours ago',
    action: 'View Customers',
  },
]

export const mockNotifications = [
  { id: 1, type: 'stock',    severity: 'critical', message: 'Industrial Bearings 6205 critically low (24 units, reorder: 50)',       time: '10 min ago', read: false },
  { id: 2, type: 'churn',   severity: 'warning',  message: 'Mahindra Agri Solutions hasn\'t purchased in 45 days',                  time: '4 hr ago',   read: false },
  { id: 3, type: 'stock',   severity: 'critical', message: 'Hydraulic Oil 68L will deplete in ~7 days',                             time: '1 hr ago',   read: false },
  { id: 4, type: 'expense', severity: 'warning',  message: 'Logistics expenses 22% above monthly average',                          time: '6 hr ago',   read: false },
  { id: 5, type: 'sales',   severity: 'success',  message: 'July revenue target exceeded by 7.4% 🎉',                               time: '30 min ago', read: true  },
  { id: 6, type: 'stock',   severity: 'warning',  message: 'Carbon Steel Sheets 2mm at 60% of reorder level',                      time: '2 hr ago',   read: true  },
  { id: 7, type: 'sales',   severity: 'info',     message: 'Weekly sales report is ready for download',                             time: '1 day ago',  read: true  },
  { id: 8, type: 'churn',   severity: 'info',     message: '3 pharma customers identified as high-potential leads',                  time: '8 hr ago',   read: true  },
]

export const mockProducts = [
  { id: 'P001', name: 'Industrial Bearings 6205', category: 'Mechanical', price: 850,  salesQty: 42  },
  { id: 'P002', name: 'Hydraulic Oil 68L',         category: 'Lubricants', price: 1200, salesQty: 28  },
  { id: 'P003', name: 'Carbon Steel Sheets 2mm',   category: 'Raw Material',price: 4500,salesQty: 15  },
  { id: 'P004', name: 'Rubber Gaskets Pack 100',   category: 'Sealing',    price: 320,  salesQty: 65  },
  { id: 'P005', name: 'Stainless Steel Bolts M10', category: 'Fasteners',  price: 180,  salesQty: 210 },
]

export const mockSalesPrediction = [
  { month: 'Aug (pred)', revenue: 5100000, type: 'predicted' },
  { month: 'Sep (pred)', revenue: 5350000, type: 'predicted' },
  { month: 'Oct (pred)', revenue: 5600000, type: 'predicted' },
]
