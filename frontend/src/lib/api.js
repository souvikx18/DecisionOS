// src/lib/api.js
// ============================================================
// Central Axios Instance — All API calls go through here
// • Base URL from VITE_API_URL env var
// • withCredentials: true (HTTP-only cookie session auth)
// • Auto-redirects to /login on 401
// ============================================================

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,          // send HTTP-only session cookie on every request
  timeout: 30000,                 // 30s — generous for PDF generation
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Response Interceptor ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Auto-redirect on session expiry
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Convenience helpers ────────────────────────────────────────

/** Extract the `.data` field from a DecisionOS success envelope */
export function unwrap(res) {
  return res.data?.data ?? res.data
}

/** Extract `.meta` (pagination etc.) from envelope */
export function unwrapMeta(res) {
  return res.data?.meta ?? null
}

export default api
