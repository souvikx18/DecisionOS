// src/lib/hooks/useApi.js
// ============================================================
// Generic data-fetching hook used by all pages
// Returns { data, loading, error, refetch }
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * @param {Function} fetchFn  — async function that returns data (already unwrapped)
 * @param {Array}    deps     — dependency array (re-fetches when changed)
 * @param {object}   options
 * @param {boolean}  options.skip — if true, skip initial fetch (useful for conditional calls)
 */
export function useApi(fetchFn, deps = [], { skip = false } = {}) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError]     = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const run = useCallback(async () => {
    if (skip) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      if (mountedRef.current) setData(result)
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.response?.data?.error?.message || err.message || 'Request failed')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip])

  useEffect(() => {
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  return { data, loading, error, refetch: run }
}
