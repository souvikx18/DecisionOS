import { useState } from 'react'
import { Search, Bell, ChevronDown, Calendar, Sun, Moon, Menu, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotifications } from '../../context/NotificationContext'
import { useNavigate } from 'react-router-dom'
import { E2EESecurityModal } from '../ui/E2EESecurityModal'
import './Topbar.css'

export default function Topbar({ sidebarCollapsed, onToggleSidebar }) {
  const { user, e2eeEnabled } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { hasUnread } = useNotifications()
  const navigate = useNavigate()
  const [searchFocused, setSearchFocused] = useState(false)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false)
  const isDark = theme === 'dark'

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

      {/* Search */}
      <div className={`topbar__search ${searchFocused ? 'topbar__search--focused' : ''}`}>
        <Search size={15} className="topbar__search-icon" />
        <input
          type="text"
          placeholder="Search insights, customers, reports…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      {/* Right section */}
      <div className="topbar__right">
        {/* Date */}
        <div className="topbar__date">
          <Calendar size={14} />
          <span>{today}</span>
        </div>

        {/* E2EE Security Vault Button */}
        <button
          onClick={() => setIsSecurityModalOpen(true)}
          className="topbar__icon-btn"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600
          }}
          title="Open Zero-Knowledge E2EE Vault"
        >
          <ShieldCheck size={16} className="animate-pulse" />
          <span className="hidden sm:inline">E2EE Vault</span>
        </button>

        {/* Theme toggle */}
        <button
          className="topbar__icon-btn topbar__theme-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          id="topbar-theme-toggle"
        >
          {isDark
            ? <Sun size={17} strokeWidth={1.75} />
            : <Moon size={17} strokeWidth={1.75} />
          }
        </button>

        {/* Notifications */}
        <button
          className="topbar__icon-btn"
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          <Bell size={18} strokeWidth={1.75} />
          {hasUnread && <span className="topbar__notif-dot" />}
        </button>

        {/* User chip */}
        <div className="topbar__user">
          <div className="topbar__avatar">
            {user?.photo
              ? <img src={user.photo} alt={user.name} className="topbar__avatar-photo" />
              : (user?.avatar || 'U')
            }
          </div>
          <div className="topbar__user-info">
            <span className="topbar__user-name">{user?.name}</span>
            <span className="topbar__company">{user?.company?.name}</span>
          </div>
          <ChevronDown size={14} className="topbar__chevron" />
        </div>
      </div>

      {/* E2EE Security Vault Modal */}
      <E2EESecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </header>
  )
}
