import { createContext, useContext, useState, useEffect } from 'react'
import { mockNotifications } from '../data/mockData'
import { notify } from '../components/ui/CustomToast'

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

  useEffect(() => {
    try {
      localStorage.setItem('decisionos_notifications', JSON.stringify(notifs))
    } catch (err) {
      console.error('Failed to save notifications to localStorage:', err)
    }
  }, [notifs])

  const unreadCount = notifs.filter(n => !n.read).length
  const hasUnread = unreadCount > 0

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    notify.success('All unread alerts have been marked as read.', 'Notifications Cleared')
  }

  const markRead = (id) => {
    setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }

  const deleteNotif = (id) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
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
