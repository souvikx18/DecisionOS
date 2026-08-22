import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import {
  LayoutDashboard, UploadCloud, Sparkles, FileText,
  Bell, LogOut, Settings, ChevronRight, ShoppingCart, CreditCard, Package, Users
} from 'lucide-react'
import logoFull from '../../assets/logo.png'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/import',        icon: UploadCloud,     label: 'Data Import' },
  { to: '/insights',      icon: Sparkles,        label: 'AI Insights' },
  { to: '/reports',       icon: FileText,        label: 'Reports' },
  { to: '/sales',         icon: ShoppingCart,    label: 'Sales' },
  { to: '/expenses',      icon: CreditCard,      label: 'Expenses' },
  { to: '/inventory',     icon: Package,         label: 'Inventory' },
  { to: '/customers',     icon: Users,           label: 'Customers' },
  { to: '/notifications', icon: Bell,            label: 'Notifications' },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth()
  const { hasUnread, unreadCount } = useNotifications()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo — click to toggle sidebar */}
      <div
        className={`sidebar__logo sidebar__logo--clickable${collapsed ? ' sidebar__logo--is-collapsed' : ''}`}
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          /* Collapsed: small icon + full blur overlay on hover */
          <>
            <div className="sidebar__logo-icon-collapsed">
              <img src={logoFull} alt="DecisionOS" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            </div>
            <div className="sidebar__logo-overlay">
              <ChevronRight size={16} className="sidebar__logo-chevron" />
            </div>
          </>
        ) : (
          /* Expanded: logo stays visible, close hint appears on hover */
          <>
            <img src={logoFull} alt="DecisionOS" className="sidebar__logo-img" />
            <div className="sidebar__logo-close-hint">
              <ChevronRight
                size={15}
                className="sidebar__logo-chevron"
                style={{ transform: 'rotate(180deg)' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => {
              if (window.innerWidth < 768) setCollapsed(true)
            }}
            className={({ isActive }) =>
              `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} strokeWidth={1.75} className="sidebar__nav-icon" />
            {!collapsed && <span className="sidebar__nav-label">{label}</span>}
            {!collapsed && to === '/notifications' && hasUnread && (
              <span className="sidebar__notif-badge">{unreadCount}</span>
            )}
            {collapsed && to === '/notifications' && hasUnread && (
              <span className="sidebar__notif-dot-collapsed" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="sidebar__bottom">
        {collapsed ? (
          /* ── Collapsed: avatar centered + icon buttons stacked ── */
          <>
            <div className="sidebar__user-collapsed-wrap" title={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}>
              <div className="sidebar__avatar sidebar__avatar--lg">
                {`${user?.firstName ?? 'U'}`.slice(0,1).toUpperCase()}
              </div>
            </div>
            <div className="sidebar__actions-collapsed">
              <NavLink to="/settings" className="sidebar__action-btn" title="Settings">
                <Settings size={15} strokeWidth={1.75} />
              </NavLink>
              <button className="sidebar__action-btn sidebar__action-btn--logout" title="Logout" onClick={handleLogout}>
                <LogOut size={15} strokeWidth={1.75} />
              </button>
            </div>
          </>
        ) : (
          /* ── Expanded: unified professional user card ── */
          <div className="sidebar__user-card">
            <div className="sidebar__avatar">
              {`${user?.firstName ?? 'U'}`.slice(0,1).toUpperCase()}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email}</span>
              <span className="sidebar__user-role">{user?.email}</span>
            </div>
            <div className="sidebar__card-actions">
              <NavLink to="/settings" className="sidebar__action-btn" title="Settings">
                <Settings size={14} strokeWidth={1.75} />
              </NavLink>
              <button className="sidebar__action-btn sidebar__action-btn--logout" title="Logout" onClick={handleLogout}>
                <LogOut size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
