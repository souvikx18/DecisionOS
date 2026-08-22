// src/pages/AIInsights.jsx
// ============================================================
// AI Insights — wired to real Gemini backend
// ============================================================

import { useState } from 'react'
import InsightCard from '../components/ui/InsightCard'
import { useInsights, useInsightsSummary, useGenerateInsights } from '../lib/hooks/useAI.js'
import { Sparkles, RefreshCw, Filter, Loader2 } from 'lucide-react'
import { notify } from '../components/ui/CustomToast'
import './AIInsights.css'

const SEVERITIES = ['all', 'critical', 'warning', 'info', 'success']
const TYPES = ['all', 'sales', 'inventory', 'churn', 'expense']

const Shimmer = ({ h = 80 }) => (
  <div style={{ height: h, borderRadius: 10, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: 12 }} />
)

export default function AIInsights() {
  const [activeSeverity, setActiveSeverity] = useState('all')
  const [activeType, setActiveType]         = useState('all')

  // Build filter params for API
  const filters = {}
  if (activeSeverity !== 'all') filters.severity = activeSeverity
  if (activeType !== 'all')     filters.type      = activeType
  filters.limit = 50

  const { data: insightData, loading, refetch } = useInsights(filters)
  const { data: summaryData }                   = useInsightsSummary()
  const { generating, generate }                = useGenerateInsights()

  const insights = Array.isArray(insightData) ? insightData : (insightData?.insights ?? [])
  const counts = {
    critical: summaryData?.bySeverity?.critical ?? 0,
    warning:  summaryData?.bySeverity?.warning  ?? 0,
    info:     summaryData?.bySeverity?.info      ?? 0,
    success:  summaryData?.bySeverity?.success   ?? 0,
  }

  const handleRefresh = async () => {
    try {
      await generate()
      await refetch()
      notify.ai('All intelligence models re-analyzed with latest business parameters.', 'AI Insights Refreshed 🎉')
    } catch {
      notify.error('Could not refresh insights. Ensure backend is running.', 'Refresh Failed')
    }
  }

  return (
    <div className="insights-page">
      <div className="insights-page__header">
        <div>
          <h1 className="insights-page__title">AI Insights</h1>
          <p className="insights-page__sub">Automatically generated insights from your business data via Gemini AI.</p>
        </div>
        <button
          className={`btn-primary ${generating ? 'btn-loading' : ''}`}
          onClick={handleRefresh}
          disabled={generating}
          id="refresh-insights"
        >
          {generating
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <RefreshCw size={14} />
          }
          {generating ? 'Analyzing…' : 'Refresh Insights'}
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
        {loading ? (
          [1,2,3,4].map(i => <Shimmer key={i} h={100} />)
        ) : insights.length === 0 ? (
          <div className="insights-empty">
            <Sparkles size={32} style={{ color: 'var(--text-disabled)' }} />
            <p>No insights match your filters.</p>
            <button className="btn-ghost" style={{ marginTop: 8 }} onClick={handleRefresh} disabled={generating}>
              {generating ? 'Generating…' : 'Generate Now'}
            </button>
          </div>
        ) : (
          insights.map(insight => (
            <InsightCard
              key={insight.id}
              {...insight}
              onAction={() => notify.info('Opening detailed metric analytics…', 'Deep Analysis')}
            />
          ))
        )}
      </div>

      {/* AI disclaimer */}
      <p className="insights-disclaimer">
        <Sparkles size={12} /> AI insights are generated by Gemini based on your uploaded data. Confidence levels indicate model certainty. Always validate critical decisions with domain expertise.
      </p>
    </div>
  )
}
