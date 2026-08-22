// src/lib/hooks/useDashboard.js
// ============================================================
// Dashboard API Hooks
// ============================================================

import api, { unwrap } from '../api.js'
import { useApi } from './useApi.js'

// ── API functions ──────────────────────────────────────────────

export const fetchExecutiveSummary  = () => api.get('/analytics/summary').then(unwrap)
export const fetchRevenueTrend      = (months = 6) => api.get(`/analytics/revenue-trend?months=${months}`).then(unwrap)
export const fetchExpenseBreakdown  = () => api.get('/analytics/expense-breakdown').then(unwrap)
export const fetchTopCustomers      = () => api.get('/customers?limit=5&sortBy=totalRevenue&order=desc').then(unwrap)
export const fetchInventoryAlerts   = () => api.get('/inventory?lowStock=true&limit=6').then(unwrap)

// ── React Hooks ────────────────────────────────────────────────

export const useExecutiveSummary = () =>
  useApi(fetchExecutiveSummary, [])

export const useRevenueTrend = (months = 6) =>
  useApi(() => fetchRevenueTrend(months), [months])

export const useExpenseBreakdown = () =>
  useApi(fetchExpenseBreakdown, [])

export const useTopCustomers = () =>
  useApi(fetchTopCustomers, [])

export const useInventoryAlerts = () =>
  useApi(fetchInventoryAlerts, [])
