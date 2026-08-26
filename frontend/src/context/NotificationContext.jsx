// src/context/NotificationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { mockNotifications } from '../data/mockData'
import { notify } from '../components/ui/CustomToast'
import { useRealtime } from '../lib/hooks/useRealtime.js'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notifs, setNotifs] = useState(() => {
    try {
      const saved = localStorage.getItem('decisionos_notifications')
      return saved ? JSON.parse(saved) : mockNotifications
    } catch {
      return mockNotifications
    }
  })

  const { connected, on } = useRealtime()

  // Subscribe to real-time events from WebSocket hub
  useEffect(() => {
    // 1. Report Ready Event
    const unsubReport = on('REPORT_READY', (data) => {
      notify.success(`Report "${data.title}" is ready for download!`, 'Report Ready 📑')
      
      const newEntry = {
        id: 'notif_rep_' + Date.now(),
        title: 'Report Generated',
        message: `Report "${data.title}" (${data.type}) has finished generating.`,
        type: 'success',
        time: 'Just now',
        read: false,
        link: '/reports',
      }
      setNotifs((prev) => [newEntry, ...prev])
    })

    // 2. Import Completed Event
    const unsubImport = on('IMPORT_COMPLETED', (data) => {
      if (data.status === 'COMPLETED') {
        notify.success(`Successfully imported ${data.validRows} rows.`, 'Import Complete 📥')
      } else if (data.status === 'PARTIAL') {
        notify.info(`Imported ${data.validRows} rows (${data.errorRows} errors).`, 'Partial Import ⚠️')
      } else {
        notify.error('File import failed. Check error log.', 'Import Failed ❌')
      }

      const newEntry = {
        id: 'notif_imp_' + Date.now(),
        title: `${data.type} Import ${data.status}`,
        message: `${data.validRows} valid rows processed from file.`,
        type: data.status === 'COMPLETED' ? 'success' : 'warning',
        time: 'Just now',
        read: false,
        link: '/import',
      }
      setNotifs((prev) => [newEntry, ...prev])
    })

    // 3. Stock Alert Event
    const unsubStock = on('STOCK_ALERT', (data) => {
      notify.error(data.message || `Item ${data.sku} dropped below reorder level!`, 'Low Stock Alert ⚠️')

      const newEntry = {
        id: 'notif_stock_' + Date.now(),
        title: 'Low Stock Alert',
        message: data.message || `SKU ${data.sku} has reached critical level.`,
        type: 'error',
        time: 'Just now',
        read: false,
        link: '/inventory',
      }
      setNotifs((prev) => [newEntry, ...prev])
    })

    return () => {
      unsubReport?.()
      unsubImport?.()
      unsubStock?.()
    }
  }, [on])

  useEffect(() => {
    try {
      localStorage.setItem('decisionos_notifications', JSON.stringify(notifs))
    } catch (err) {
      console.error('Failed to save notifications to localStorage:', err)
    }
  }, [notifs])

  const unreadCount = notifs.filter((n) => !n.read).length
  const hasUnread = unreadCount > 0

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    notify.success('All unread alerts have been marked as read.', 'Notifications Cleared')
  }

  const markRead = (id) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const deleteNotif = (id) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = () => {
    setNotifs([])
    notify.info('All notification entries cleared from inbox.', 'Inbox Empty')
  }

  return (
    <NotificationContext.Provider
      value={{
        notifs,
        unreadCount,
        hasUnread,
        connected,
        markAllRead,
        markRead,
        deleteNotif,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
