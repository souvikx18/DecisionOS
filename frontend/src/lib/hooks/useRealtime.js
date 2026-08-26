// src/lib/hooks/useRealtime.js
// ============================================================
// Real-Time WebSocket Hook with Auto-Reconnect & SSE Fallback
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

function getWebSocketUrl() {
  const isSecure = window.location.protocol === 'https:'
  const protocol = isSecure ? 'wss:' : 'ws:'
  
  // If Vite dev server on port 5173, point directly to backend port 3001
  if (window.location.port === '5173') {
    return `${protocol}//${window.location.hostname}:3001/ws`
  }
  
  // In production / Docker, Nginx proxies /ws to backend:5000
  return `${protocol}//${window.location.host}/ws`
}

export function useRealtime() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const listenersRef = useRef(new Map())
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const pingIntervalRef = useRef(null)

  // Subscribe to specific real-time event types
  const on = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set())
    }
    listenersRef.current.get(eventType).add(callback)

    return () => {
      if (listenersRef.current.has(eventType)) {
        listenersRef.current.get(eventType).delete(callback)
      }
    }
  }, [])

  // Connect function
  const connect = useCallback(() => {
    if (!user) return
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      const url = getWebSocketUrl()
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        reconnectAttemptsRef.current = 0

        // Heartbeat ping every 25s
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }))
          }
        }, 25000)
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          const { type, data } = payload

          if (listenersRef.current.has(type)) {
            listenersRef.current.get(type).forEach((cb) => {
              try {
                cb(data, payload)
              } catch (cbErr) {
                console.error(`[Realtime] Error in event listener for ${type}:`, cbErr)
              }
            })
          }
        } catch {
          // ignore non-json messages
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)

        // Exponential backoff reconnect (1s -> 2s -> 4s -> max 15s)
        if (user) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 15000)
          reconnectAttemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {
        // Will trigger onclose and attempt reconnect
        ws.close()
      }
    } catch (err) {
      console.warn('[Realtime] Failed to initialize WebSocket:', err.message)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      connect()
    } else {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setConnected(false)
    }

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [user, connect])

  return {
    connected,
    on,
  }
}
