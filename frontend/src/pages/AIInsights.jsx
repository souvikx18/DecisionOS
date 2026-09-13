// src/pages/AIInsights.jsx
// ============================================================
// AI Insights — wired to real Gemini backend
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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

  const handleAction = (actionText) => {
    const text = String(actionText || '').toLowerCase()
    if (text.includes('dashboard') || text.includes('analytic')) {
      navigate('/dashboard')
    } else if (text.includes('inventory') || text.includes('stock')) {
      navigate('/inventory')
    } else if (text.includes('sale') || text.includes('revenue')) {
      navigate('/sales')
    } else if (text.includes('expense')) {
      navigate('/expenses')
    } else if (text.includes('customer') || text.includes('churn')) {
      navigate('/customers')
    } else if (text.includes('report')) {
      navigate('/reports')
    } else {
      navigate('/dashboard')
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
          id="refresh-insights-btn"
        >
          {generating ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
          {generating ? 'Re-analyzing Models…' : 'Re-run AI Analysis'}
        </button>
      </div>

      {/* Filter bars */}
      <div className="glass-card insights-filters">
        <div className="insights-filter-group">
          <span className="insights-filter-label"><Filter size={13} /> Severity</span>
          <div className="insights-pill-group">
            {SEVERITIES.map(s => (
              <button
                key={s}
                className={`insights-pill ${activeSeverity === s ? 'insights-pill--active' : ''}`}
                onClick={() => setActiveSeverity(s)}
                id={`sev-${s}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {counts[s] !== undefined && counts[s] > 0 && (
                  <span className="insights-pill-count">{counts[s]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="insights-filter-group">
          <span className="insights-filter-label">Domain</span>
          <div className="insights-pill-group">
            {TYPES.map(t => (
              <button
                key={t}
                className={`insights-pill ${activeType === t ? 'insights-pill--active' : ''}`}
                onClick={() => setActiveType(t)}
                id={`type-${t}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Insights list */}
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
              onAction={() => handleAction(insight.action || insight.details?.action)}
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
