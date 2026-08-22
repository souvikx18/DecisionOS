// src/components/ui/CustomToast.jsx
import { toast } from 'react-hot-toast'
import {
  Check,
  AlertTriangle,
  Info,
  Sparkles,
  Loader2,
  X
} from 'lucide-react'
import './CustomToast.css'

const TOAST_THEMES = {
  success: {
    icon: Check,
    badgeClass: 'sonner-toast__icon--success',
    pillClass: 'sonner-toast--success',
    defaultTitle: 'Success',
    glowColor: 'rgba(16, 185, 129, 0.22)',
  },
  error: {
    icon: AlertTriangle,
    badgeClass: 'sonner-toast__icon--error',
    pillClass: 'sonner-toast--error',
    defaultTitle: 'Error',
    glowColor: 'rgba(239, 68, 68, 0.22)',
  },
  info: {
    icon: Info,
    badgeClass: 'sonner-toast__icon--info',
    pillClass: 'sonner-toast--info',
    defaultTitle: 'Notice',
    glowColor: 'rgba(59, 130, 246, 0.22)',
  },
  ai: {
    icon: Sparkles,
    badgeClass: 'sonner-toast__icon--ai',
    pillClass: 'sonner-toast--ai',
    defaultTitle: 'AI Insight',
    glowColor: 'rgba(139, 92, 246, 0.28)',
  },
  loading: {
    icon: Loader2,
    badgeClass: 'sonner-toast__icon--loading',
    pillClass: 'sonner-toast--loading',
    defaultTitle: 'Processing',
    glowColor: 'rgba(6, 182, 212, 0.22)',
  },
}

export function CustomToastCard({ t, type = 'success', title, message }) {
  const theme = TOAST_THEMES[type] || TOAST_THEMES.success
  const Icon = theme.icon
  const displayTitle = title || theme.defaultTitle

  return (
    <div
      className={`sonner-toast ${t.visible ? 'sonner-toast--enter' : 'sonner-toast--exit'} ${theme.pillClass}`}
      role="status"
      aria-live="polite"
      onClick={() => toast.dismiss(t.id)}
    >
      {/* Ambient glass glow */}
      <div className="sonner-toast__glow" />

      {/* Shimmer sweep effect */}
      <div className="sonner-toast__shimmer" />

      {/* Icon with pulsing status dot container */}
      <div className={`sonner-toast__icon-box ${theme.badgeClass}`}>
        <Icon size={14} strokeWidth={2.6} className={type === 'loading' ? 'sonner-toast__spinner' : ''} />
      </div>

      {/* Text Hierarchy */}
      <div className="sonner-toast__content">
        <div className="sonner-toast__row">
          <span className="sonner-toast__title">{displayTitle}</span>
          {type === 'ai' && <span className="sonner-toast__pill-tag">AI</span>}
        </div>
        {message && <p className="sonner-toast__message">{message}</p>}
      </div>

      {/* Quick Dismiss Button */}
      <button
        type="button"
        className="sonner-toast__close"
        onClick={(e) => {
          e.stopPropagation()
          toast.dismiss(t.id)
        }}
        aria-label="Close notification"
      >
        <X size={13} strokeWidth={2.4} />
      </button>
    </div>
  )
}

// ── Ergonomic Notification Dispatcher ───────────────────────────────────────────
export const notify = {
  success: (message, title, options = {}) => {
    return toast.custom(
      (t) => <CustomToastCard t={t} type="success" title={title} message={message} />,
      { duration: 4200, ...options }
    )
  },

  error: (message, title, options = {}) => {
    return toast.custom(
      (t) => <CustomToastCard t={t} type="error" title={title} message={message} />,
      { duration: 5200, ...options }
    )
  },

  info: (message, title, options = {}) => {
    return toast.custom(
      (t) => <CustomToastCard t={t} type="info" title={title} message={message} />,
      { duration: 4200, ...options }
    )
  },

  ai: (message, title = 'AI Insights', options = {}) => {
    return toast.custom(
      (t) => <CustomToastCard t={t} type="ai" title={title} message={message} />,
      { duration: 4800, ...options }
    )
  },

  loading: (message, title = 'Processing', options = {}) => {
    return toast.custom(
      (t) => <CustomToastCard t={t} type="loading" title={title} message={message} />,
      { duration: Infinity, ...options }
    )
  },
}
