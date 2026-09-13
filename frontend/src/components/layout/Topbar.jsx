import { useState } from 'react'
import { Search, Bell, ChevronDown, Calendar, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { useNavigate } from 'react-router-dom'
import logoFull from '../../assets/logo.png'
import './Topbar.css'

export default function Topbar({ sidebarCollapsed, onToggleSidebar }) {
  const { user } = useAuth()
  const { hasUnread } = useNotifications()
  const navigate = useNavigate()
  const [searchFocused, setSearchFocused] = useState(false)

  const companyLogo = user?.org?.logoUrl || user?.company?.logoUrl || logoFull
  const orgName = user?.company?.name || user?.org?.name || 'Company'

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <header
      className="topbar"
      style={{ left: sidebarCollapsed ? 64 : 220 }}
    >
      {/* Mobile Sidebar Toggle */}
      <button
        className="topbar__menu-btn"
        onClick={onToggleSidebar}
        title="Toggle Menu"
      >
        <Menu size={18} />
      </button>

      {/* Search Bar */}
      <div className={`topbar__search ${searchFocused ? 'topbar__search--focused' : ''}`}>
        <Search size={15} className="topbar__search-icon" />
        <input
          type="text"
          placeholder="Search insights, customers, reports…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      {/* Right Section */}
      <div className="topbar__right">
        {/* Date */}
        <div className="topbar__date">
          <Calendar size={14} />
          <span>{today}</span>
        </div>

        {/* Notifications */}
        <button
          className="topbar__icon-btn"
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          <Bell size={18} strokeWidth={1.75} />
          {hasUnread && <span className="topbar__notif-dot" />}
        </button>

        {/* User Profile Pill */}
        <div
          className="topbar__user"
          onClick={() => navigate('/settings', { state: { tab: 'profile' } })}
          role="button"
          tabIndex={0}
          title="Open Profile"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate('/settings', { state: { tab: 'profile' } })
            }
          }}
        >
          <div className="topbar__avatar">
            <img src={companyLogo} alt={orgName} className="topbar__avatar-photo" />
          </div>
          <div className="topbar__user-info">
            <span className="topbar__user-name">{user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Executive'}</span>
            <span className="topbar__company">{user?.company?.name || user?.org?.name || 'DecisionOS'}</span>
          </div>
          <ChevronDown size={14} className="topbar__chevron" />
        </div>
      </div>
    </header>
  )
}
