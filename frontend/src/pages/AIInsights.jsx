import { useState } from 'react'
import InsightCard from '../components/ui/InsightCard'
import { mockAIInsights } from '../data/mockData'
import { Sparkles, RefreshCw, Filter } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { notify } from '../components/ui/CustomToast'
import './AIInsights.css'

const SEVERITIES = ['all', 'critical', 'warning', 'info', 'success']
const TYPES = ['all', 'sales', 'inventory', 'churn', 'expense']

export default function AIInsights() {
  const [activeSeverity, setActiveSeverity] = useState('all')
  const [activeType, setActiveType] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const filtered = mockAIInsights.filter(i =>
    (activeSeverity === 'all' || i.severity === activeSeverity) &&
    (activeType === 'all' || i.type === activeType)
  )

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      notify.ai('All intelligence models re-analyzed with latest business parameters.', 'AI Insights Refreshed 🎉')
    }, 1200)
  }

  const counts = {
    critical: mockAIInsights.filter(i => i.severity === 'critical').length,
    warning:  mockAIInsights.filter(i => i.severity === 'warning').length,
    info:     mockAIInsights.filter(i => i.severity === 'info').length,
    success:  mockAIInsights.filter(i => i.severity === 'success').length,
  }

  return (
    <div className="insights-page">
      <div className="insights-page__header">
        <div>
          <h1 className="insights-page__title">AI Insights</h1>
          <p className="insights-page__sub">Automatically generated insights from your business data.</p>
        </div>
        <button
          className={`btn-primary ${refreshing ? 'btn-loading' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
          id="refresh-insights"
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Analyzing…' : 'Refresh Insights'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="insights-summary">
        {[
          { label: 'Critical', count: counts.critical, cls: 'critical', color: 'var(--accent-error)' },
          { label: 'Warnings', count: counts.warning,  cls: 'warning',  color: 'var(--accent-warning)' },
          { label: 'Info',     count: counts.info,     cls: 'info',     color: 'var(--accent-primary)' },
          { label: 'Positive', count: counts.success,  cls: 'success',  color: 'var(--accent-success)' },
        ].map(s => (
          <button
            key={s.label}
            className={`insights-summary__card glass-card ${activeSeverity === s.cls ? 'insights-summary__card--active' : ''}`}
            onClick={() => setActiveSeverity(prev => prev === s.cls ? 'all' : s.cls)}
          >
            <div className="insights-summary__dot" style={{ background: s.color }} />
            <span className="insights-summary__count" style={{ color: s.color }}>{s.count}</span>
            <span className="insights-summary__label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="insights-filters glass-card">
        <Filter size={14} style={{ color: 'var(--text-disabled)' }} />
        <span className="insights-filters__label">Filter by type:</span>
        {TYPES.map(t => (
          <button
            key={t}
            className={`dashboard__filter-btn ${activeType === t ? 'dashboard__filter-btn--active' : ''}`}
            onClick={() => setActiveType(t)}
          >
            {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Insights grid */}
      <div className="insights-grid">
        {filtered.length === 0 ? (
          <div className="insights-empty">
            <Sparkles size={32} style={{ color: 'var(--text-disabled)' }} />
            <p>No insights match your current filters.</p>
          </div>
        ) : (
          filtered.map(insight => (
            <InsightCard key={insight.id} {...insight} onAction={() => notify.info('Opening detailed metric analytics…', 'Deep Analysis')} />
          ))
        )}
      </div>

      {/* AI disclaimer */}
      <p className="insights-disclaimer">
        <Sparkles size={12} /> AI insights are generated based on your uploaded data. Confidence levels indicate model certainty. Always validate critical decisions with domain expertise.
      </p>
    </div>
  )
}
