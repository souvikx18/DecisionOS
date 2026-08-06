import { toast } from 'react-hot-toast'
import { CheckCircle2, AlertTriangle, Info, Sparkles, RefreshCw, X } from 'lucide-react'
import './CustomToast.css'

const TOAST_TYPES = {
  success: {
    icon: CheckCircle2,
    badgeClass: 'custom-toast__badge--success',
    barClass: 'custom-toast__bar--success',
    defaultTitle: 'Success',
  },
  error: {
    icon: AlertTriangle,
    badgeClass: 'custom-toast__badge--error',
    barClass: 'custom-toast__bar--error',
    defaultTitle: 'Attention Needed',
  },
  info: {
    icon: Info,
    badgeClass: 'custom-toast__badge--info',
    barClass: 'custom-toast__bar--info',
    defaultTitle: 'Notification',
  },
  ai: {
    icon: Sparkles,
    badgeClass: 'custom-toast__badge--ai',
    barClass: 'custom-toast__bar--ai',
    defaultTitle: 'AI Intelligence',
  },
  loading: {
    icon: RefreshCw,
    badgeClass: 'custom-toast__badge--loading',
    barClass: 'custom-toast__bar--loading',
    defaultTitle: 'Processing…',
  },
}

export function CustomToastCard({ t, type = 'success', title, message }) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.success
  const Icon = config.icon
  const displayTitle = title || config.defaultTitle

  return (
    <div className={`custom-toast ${t.visible ? 'custom-toast--show' : 'custom-toast--hide'} custom-toast--${type}`}>
      {/* Ambient top highlight beam */}
      <div className="custom-toast__beam" />

      {/* Left Icon Badge */}
      <div className={`custom-toast__badge ${config.badgeClass}`}>
        <Icon size={18} strokeWidth={2.2} className={type === 'loading' ? 'custom-toast__spinner' : ''} />
      </div>

      {/* Main Content */}
      <div className="custom-toast__content">
        <h4 className="custom-toast__title">{displayTitle}</h4>
        {message && <p className="custom-toast__message">{message}</p>}
      </div>

      {/* Close button */}
      <button
        className="custom-toast__close"
        onClick={() => toast.dismiss(t.id)}
        aria-label="Close notification"
      >
        <X size={14} strokeWidth={2.2} />
      </button>

      {/* Bottom timer animation bar */}
      {type !== 'loading' && <div className={`custom-toast__timer ${config.barClass}`} />}
    </div>
  )
}

// ── Convenient helper functions ──────────────────────────────────────────────
export const notify = {
  success: (message, title, options = {}) => {
    return toast.custom((t) => (
      <CustomToastCard t={t} type="success" title={title} message={message} />
    ), { duration: 4000, ...options })
  },

  error: (message, title, options = {}) => {
    return toast.custom((t) => (
      <CustomToastCard t={t} type="error" title={title} message={message} />
    ), { duration: 5000, ...options })
  },

  info: (message, title, options = {}) => {
    return toast.custom((t) => (
      <CustomToastCard t={t} type="info" title={title} message={message} />
    ), { duration: 4000, ...options })
  },

  ai: (message, title = 'AI Insights', options = {}) => {
    return toast.custom((t) => (
      <CustomToastCard t={t} type="ai" title={title} message={message} />
    ), { duration: 4500, ...options })
  },

  loading: (message, title = 'Processing', options = {}) => {
    return toast.custom((t) => (
      <CustomToastCard t={t} type="loading" title={title} message={message} />
    ), { duration: Infinity, ...options })
  },
}
