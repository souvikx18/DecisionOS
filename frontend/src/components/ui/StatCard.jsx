import { TrendingUp, TrendingDown } from 'lucide-react'
import './StatCard.css'

export default function StatCard({ icon: Icon, label, value, change, changeLabel, color = 'blue', prefix = '', suffix = '' }) {
  const positive = parseFloat(change) >= 0

  return (
    <div className="stat-card glass-card">
      <div className="stat-card__header">
        <div className={`stat-card__icon-wrap stat-card__icon-wrap--${color}`}>
          <Icon size={18} strokeWidth={1.75} />
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
