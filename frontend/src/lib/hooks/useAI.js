// src/lib/hooks/useAI.js
// ============================================================
// AI Engine API Hooks
// ============================================================

import api, { unwrap, unwrapMeta } from '../api.js'
import { useApi } from './useApi.js'
import { useState, useCallback } from 'react'

// ── API functions ──────────────────────────────────────────────

export const fetchInsights = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return api.get(`/ai/insights${query ? `?${query}` : ''}`).then(unwrap)
}

export const fetchInsightsSummary = () => api.get('/ai/insights/summary').then(unwrap)

export const triggerGenerateInsights = () => api.post('/ai/generate').then(unwrap)

export const fetchRevenueForecast = (months = 3) =>
  api.get(`/ai/forecast/revenue?months=${months}`).then(unwrap)

// ── React Hooks ────────────────────────────────────────────────

export function useInsights(filters = {}) {
  const filterKey = JSON.stringify(filters)
  return useApi(() => fetchInsights(filters), [filterKey])
}

export function useInsightsSummary() {
  return useApi(fetchInsightsSummary, [])
}

export function useRevenueForecast(months = 3) {
  return useApi(() => fetchRevenueForecast(months), [months])
}

/** Manual trigger hook — returns { generating, generate, error } */
export function useGenerateInsights() {
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState(null)

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const result = await triggerGenerateInsights()
      return result
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Failed to generate insights'
      setError(msg)
      throw err
    } finally {
      setGenerating(false)
    }
  }, [])

  return { generating, generate, error }
}
