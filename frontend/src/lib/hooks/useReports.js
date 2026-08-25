// src/lib/hooks/useReports.js
// ============================================================
// Reports API Hooks
// ============================================================

import api, { unwrap } from '../api.js'
import { useApi } from './useApi.js'
import { useState, useCallback } from 'react'

// ── API functions ──────────────────────────────────────────────

export const fetchReports    = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return api.get(`/reports${q ? `?${q}` : ''}`).then(r => r.data?.data ?? r.data)
}

export const fetchReport     = (id) => api.get(`/reports/${id}`).then(unwrap)
export const deleteReport    = (id) => api.delete(`/reports/${id}`).then(unwrap)

export const createReport    = (payload) => api.post('/reports', payload).then(unwrap)

export const fetchDownloadUrl = (reportId, exportId) =>
  api.get(`/reports/${reportId}/download/${exportId}`).then(unwrap)

export const fetchSchedules  = () => api.get('/reports/schedules').then(unwrap)
export const createSchedule  = (payload) => api.post('/reports/schedules', payload).then(unwrap)
export const updateSchedule  = (id, payload) => api.patch(`/reports/schedules/${id}`, payload).then(unwrap)
export const deleteSchedule  = (id) => api.delete(`/reports/schedules/${id}`).then(unwrap)

// ── React Hooks ────────────────────────────────────────────────

export function useReports(params = {}) {
  const key = JSON.stringify(params)
  return useApi(() => fetchReports(params), [key])
}

export function useSchedules() {
  return useApi(fetchSchedules, [])
}

/** Manual generation hook — POST /reports, then polls status */
export function useGenerateReport() {
  const [generating, setGenerating] = useState(false)
  const [report, setReport]         = useState(null)
  const [error, setError]           = useState(null)

  const generate = useCallback(async (payload) => {
    setGenerating(true)
    setError(null)
    setReport(null)
    try {
      // Backend queues the job via BullMQ; we get back the report record
      const result = await createReport(payload)
      // Poll until READY or FAILED (max 120 s, every 3 s)
      let polls = 0
      const poll = async () => {
        if (polls++ > 40) {
          throw new Error('Report generation timed out. Please try again.')
        }
        const data = await fetchReport(result.id)
        const rep  = data?.report ?? data
        if (rep.status === 'READY' || rep.status === 'FAILED') {
          setReport(rep)
          setGenerating(false)
          return rep
        }
        await new Promise(r => setTimeout(r, 3000))
        return poll()
      }
      return await poll()
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'Generation failed'
      setError(msg)
      setGenerating(false)
      throw err
    }
  }, [])

  return { generating, report, error, generate }
}

/** Manual schedule create hook */
export function useCreateSchedule() {
  const [creating, setCreating] = useState(false)
  const [error, setError]       = useState(null)

  const create = useCallback(async (payload) => {
    setCreating(true)
    setError(null)
    try {
      const result = await createSchedule(payload)
      return result
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Failed to create schedule'
      setError(msg)
      throw err
    } finally {
      setCreating(false)
    }
  }, [])

  return { creating, error, create }
}
