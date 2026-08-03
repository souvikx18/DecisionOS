import { useState } from 'react'
import { Search, Bell, ChevronDown, Calendar, Sun, Moon, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import './Topbar.css'

export default function Topbar({ sidebarCollapsed, onToggleSidebar }) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [searchFocused, setSearchFocused] = useState(false)
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
          <span className="topbar__notif-dot" />
        </button>

        {/* User chip */}
        <div className="topbar__user">
          <div className="topbar__avatar">{user?.avatar || 'U'}</div>
          <div className="topbar__user-info">
            <span className="topbar__user-name">{user?.name}</span>
            <span className="topbar__company">{user?.company?.name}</span>
          </div>
          <ChevronDown size={14} className="topbar__chevron" />
        </div>
      </div>
    </header>
  )
}
