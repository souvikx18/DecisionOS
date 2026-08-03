import { AlertTriangle, AlertCircle, CheckCircle, Info, TrendingDown, Package, Users, DollarSign } from 'lucide-react'
import './InsightCard.css'

const SEVERITY = {
  critical: { label: 'Critical', cls: 'insight--critical', Icon: AlertCircle, badgeCls: 'badge-error' },
  warning:  { label: 'Warning',  cls: 'insight--warning',  Icon: AlertTriangle, badgeCls: 'badge-warning' },
  info:     { label: 'Info',     cls: 'insight--info',     Icon: Info, badgeCls: 'badge-info' },
  success:  { label: 'Good',     cls: 'insight--success',  Icon: CheckCircle, badgeCls: 'badge-success' },
}

const TYPE_ICON = {
  sales:     TrendingDown,
  inventory: Package,
  churn:     Users,
  expense:   DollarSign,
}

export default function InsightCard({ type = 'info', severity = 'info', title, description, meta, action, onAction }) {
  const s = SEVERITY[severity] || SEVERITY.info
  const TypeIcon = TYPE_ICON[type] || Info

  return (
    <div className={`insight-card glass-card ${s.cls}`}>
      <div className="insight-card__top">
        <div className="insight-card__icon-wrap">
          <TypeIcon size={16} strokeWidth={1.75} />
        </div>
        <span className={`badge ${s.badgeCls}`}>
          <s.Icon size={10} />
          {s.label}
        </span>
      </div>
      <div className="insight-card__title">{title}</div>
      <div className="insight-card__desc">{description}</div>
      {meta && <div className="insight-card__meta">{meta}</div>}
      {action && (
        <button className="insight-card__action" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}
