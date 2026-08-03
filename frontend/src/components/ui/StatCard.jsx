import { TrendingUp, TrendingDown } from 'lucide-react'
import './StatCard.css'

export default function StatCard({ icon: Icon, label, value, change, changeLabel, color = 'blue', prefix = '', suffix = '' }) {
  const positive = parseFloat(change) >= 0

  const colorMap = {
    blue:   { bg: '#EFF6FF', icon: '#1D4ED8', iconBg: '#DBEAFE' },
    green:  { bg: '#ECFDF5', icon: '#10B981', iconBg: '#D1FAE5' },
    amber:  { bg: '#FFFBEB', icon: '#F59E0B', iconBg: '#FEF3C7' },
    red:    { bg: '#FEF2F2', icon: '#EF4444', iconBg: '#FEE2E2' },
    indigo: { bg: '#EEF2FF', icon: '#6366F1', iconBg: '#E0E7FF' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div className="stat-card glass-card">
      <div className="stat-card__header">
        <div className="stat-card__icon-wrap" style={{ background: c.iconBg }}>
          <Icon size={18} strokeWidth={1.75} style={{ color: c.icon }} />
        </div>
        {change !== undefined && (
          <div className={`stat-card__trend ${positive ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(parseFloat(change))}%</span>
          </div>
        )}
      </div>
      <div className="stat-card__value">
        {prefix}<span>{value}</span>{suffix}
      </div>
      <div className="stat-card__label">{label}</div>
      {changeLabel && (
        <div className="stat-card__sublabel">{changeLabel}</div>
      )}
    </div>
  )
}
