import { useState } from 'react'
import { mockNotifications } from '../data/mockData'
import { Bell, TrendingDown, Package, Users, DollarSign, CheckCheck, Trash2, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'
import './Notifications.css'

const TYPE_META = {
  stock:   { icon: Package,     color: 'var(--accent-error)',   bg: '#FEE2E2' },
  churn:   { icon: Users,       color: 'var(--accent-warning)', bg: '#FEF3C7' },
  sales:   { icon: TrendingDown,color: 'var(--accent-primary)', bg: '#DBEAFE' },
  expense: { icon: DollarSign,  color: 'var(--accent-indigo)',  bg: '#E0E7FF' },
}

export default function Notifications() {
  const [notifs, setNotifs] = useState(mockNotifications)
  const [filter, setFilter] = useState('all')

  const filtered = notifs.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read')   return n.read
    return true
  })

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }
  const markRead = id => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const deleteNotif = id => setNotifs(prev => prev.filter(n => n.id !== id))
  const clearAll = () => { setNotifs([]); toast.success('All notifications cleared') }

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <div className="notif-page">
      <div className="notif-page__header">
        <div>
          <h1 className="notif-page__title">
            Notifications
            {unreadCount > 0 && <span className="notif-page__badge">{unreadCount}</span>}
          </h1>
          <p className="notif-page__sub">Alerts for stock, customer activity, sales, and expense events.</p>
        </div>
        <div className="notif-page__actions">
          {unreadCount > 0 && (
            <button className="btn-ghost" onClick={markAllRead} id="mark-all-read">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          {notifs.length > 0 && (
            <button className="btn-ghost" onClick={clearAll} style={{ color: 'var(--accent-error)' }} id="clear-all-notifs">
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="notif-filters">
        {['all', 'unread', 'read'].map(f => (
          <button
            key={f}
            className={`reports-tab ${filter === f ? 'reports-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'unread' && unreadCount > 0 && <span className="notif-filter-count">{unreadCount}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="notif-empty glass-card">
          <BellOff size={36} style={{ color: 'var(--text-disabled)' }} />
          <p>No notifications here.</p>
          <span>You're all caught up! 🎉</span>
        </div>
      ) : (
        <div className="notif-list">
          {filtered.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.sales
            const Icon = meta.icon
            return (
              <div
                key={n.id}
                className={`notif-item glass-card ${!n.read ? 'notif-item--unread' : ''}`}
                onClick={() => markRead(n.id)}
              >
                <div className="notif-item__icon" style={{ background: meta.bg, color: meta.color }}>
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <div className="notif-item__body">
                  <p className="notif-item__message">{n.message}</p>
                  <div className="notif-item__meta">
                    <span className={`badge badge-${n.severity === 'critical' ? 'error' : n.severity === 'warning' ? 'warning' : n.severity === 'success' ? 'success' : 'info'}`}>
                      {n.severity}
                    </span>
                    <span className="notif-item__time">{n.time}</span>
                  </div>
                </div>
                {!n.read && <div className="notif-item__dot" />}
                <button
                  className="notif-item__delete"
                  onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                  title="Dismiss"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
