// src/pages/Dashboard.jsx
// ============================================================
// Executive Dashboard — wired to real backend API
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, PieChart, Pie, Cell
} from 'recharts'
import StatCard from '../components/ui/StatCard'
import InsightCard from '../components/ui/InsightCard'
import {
  useExecutiveSummary, useRevenueTrend, useExpenseBreakdown,
  useTopCustomers, useInventoryAlerts,
} from '../lib/hooks/useDashboard.js'
import { useInsights } from '../lib/hooks/useAI.js'
import {
  DollarSign, ShoppingCart, CreditCard, AlertTriangle,
  TrendingUp, Package, ChevronRight, ArrowUpRight, Loader2
} from 'lucide-react'
import './Dashboard.css'

// ── Helpers ───────────────────────────────────────────────────

const fmtAmount = v => `₹${(v / 100000).toFixed(1)}L`
const AXIS_STYLE = { fill: '#475569', fontSize: 11 }

const PIE_COLORS = ['#1D4ED8', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#64748B']

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <strong>{fmtAmount(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────
const Shimmer = ({ h = 80, w = '100%', radius = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: radius, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
)

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeInsightType, setActiveInsightType] = useState('all')

  // ── Real data ──────────────────────────────────────────────
  const { data: summary, loading: sumLoading }    = useExecutiveSummary()
  const { data: trendData, loading: trendLoading } = useRevenueTrend(6)
  const { data: expData, loading: expLoading }     = useExpenseBreakdown()
  const { data: custData, loading: custLoading }   = useTopCustomers()
  const { data: invData, loading: invLoading }     = useInventoryAlerts()
  const { data: insightData, loading: insLoading } = useInsights(
    activeInsightType !== 'all' ? { type: activeInsightType, limit: 4 } : { limit: 4 }
  )

  // ── Derived values ─────────────────────────────────────────
  const kpis = summary?.kpis ?? {}

  const trendPoints = trendData?.trend ?? []
  // Add predicted points from forecast if available
  const chartData = trendPoints

  const expBreakdown = expData?.categories ?? []
  const topCustomers = Array.isArray(custData) ? custData : (custData?.customers ?? [])
  const inventoryItems = Array.isArray(invData) ? invData : (invData?.items ?? [])
  const insights = Array.isArray(insightData) ? insightData : (insightData?.insights ?? [])

  const insightTypes = ['all', 'sales', 'inventory', 'churn', 'expense']

  return (
    <div className="dashboard">
      {/* Page header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__sub">Here's what's happening in your business today.</p>
        </div>
        <div className="dashboard__header-actions">
          <button className="btn-ghost" onClick={() => navigate('/import')}>Import Data</button>
          <button className="btn-primary" onClick={() => navigate('/reports')}>
            <TrendingUp size={14} /> Generate Report
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="dashboard__kpi-grid">
        {sumLoading ? (
          [1,2,3,4].map(i => <div key={i} className="glass-card" style={{ padding: 20 }}><Shimmer /></div>)
        ) : (
          <>
            <StatCard
              icon={DollarSign} label="Total Revenue"
              value={kpis.totalRevenue?.formatted ?? '—'}
              change={kpis.totalRevenue?.growthPercent}
              changeLabel={`vs prev month`} color="blue" prefix="" />
            <StatCard
              icon={ShoppingCart} label="Total Sales"
              value={kpis.totalSales?.formatted ?? '—'}
              changeLabel={`${kpis.totalSales?.prevPeriodCount ?? 0} prev month`} color="green" />
            <StatCard
              icon={CreditCard} label="Total Expenses"
              value={kpis.totalExpenses?.formatted ?? '—'}
              change={kpis.totalExpenses?.growthPercent}
              changeLabel="vs prev month" color="amber" prefix="" />
            <StatCard
              icon={AlertTriangle} label="Inventory Alerts"
              value={String(kpis.inventory?.lowStockAlerts ?? '—')}
              changeLabel="Items below reorder level" color="red" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="dashboard__charts-row">
        {/* Revenue trend */}
        <div className="dashboard__chart-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">Revenue Trend</h2>
              <p className="dashboard__card-sub">Monthly revenue over last 6 months</p>
            </div>
            <button className="dashboard__view-all" onClick={() => navigate('/reports')}>
              View Report <ChevronRight size={14} />
            </button>
          </div>
          {trendLoading ? <Shimmer h={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EA" opacity={0.5} />
                <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtAmount} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1D4ED8" strokeWidth={2.5} dot={{ r: 3, fill: '#1D4ED8' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="dashboard__chart-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">Expense Breakdown</h2>
              <p className="dashboard__card-sub">By category · all time</p>
            </div>
          </div>
          {expLoading ? <Shimmer h={220} /> : (
            expBreakdown.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)', fontSize: 13 }}>
                No expense data yet. <button className="btn-ghost" style={{ marginLeft: 8, padding: '4px 10px' }} onClick={() => navigate('/import')}>Import</button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percentage }) => `${category} ${percentage}%`} labelLine={false}>
                    {expBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmtAmount(v)} />
                </PieChart>
              </ResponsiveContainer>
            )
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="dashboard__bottom-row">
        {/* Top customers */}
        <div className="dashboard__table-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">Top Customers</h2>
              <p className="dashboard__card-sub">By total revenue</p>
            </div>
            <button className="dashboard__view-all" onClick={() => navigate('/customers')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard__customer-list">
            {custLoading
              ? [1,2,3,4,5].map(i => <div key={i} style={{ padding: '12px 0' }}><Shimmer h={32} /></div>)
              : topCustomers.length === 0
                ? <p style={{ fontSize: 13, color: 'var(--text-disabled)', padding: '12px 0' }}>No customer data yet.</p>
                : topCustomers.slice(0, 5).map((c, idx) => (
                    <div key={c.id ?? idx} className="dashboard__customer-row">
                      <div className="dashboard__customer-rank">#{idx + 1}</div>
                      <div className="dashboard__customer-avatar">
                        {(c.name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="dashboard__customer-info">
                        <span className="dashboard__customer-name">{c.name}</span>
                        <span className="dashboard__customer-orders">{c.totalOrders ?? c._count?.sales ?? 0} orders</span>
                      </div>
                      <div className="dashboard__customer-rev">
                        <span className="dashboard__customer-amount">
                          ₹{((Number(c.totalRevenue) || 0) / 100000).toFixed(2)}L
                        </span>
                      </div>
                    </div>
                  ))
            }
          </div>
        </div>

        {/* Inventory status */}
        <div className="dashboard__table-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">Inventory Alerts</h2>
              <p className="dashboard__card-sub">Items at or below reorder level</p>
            </div>
            <button className="dashboard__view-all" onClick={() => navigate('/inventory')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard__inventory-list">
            {invLoading
              ? [1,2,3,4].map(i => <div key={i} style={{ padding: '12px 0' }}><Shimmer h={36} /></div>)
              : inventoryItems.length === 0
                ? <p style={{ fontSize: 13, color: 'var(--text-disabled)', padding: '12px 0' }}>No inventory alerts.</p>
                : inventoryItems.slice(0, 6).map(item => {
                    const reorder = item.reorderLevel ?? item.reorder_level ?? 1
                    const stock   = item.quantity ?? 0
                    const pct     = Math.min(100, Math.round((stock / Math.max(reorder, 1)) * 100))
                    const status  = pct <= 25 ? 'critical' : pct <= 60 ? 'warning' : 'ok'
                    return (
                      <div key={item.id} className="dashboard__inventory-row">
                        <div className="dashboard__inventory-icon"><Package size={14} /></div>
                        <div className="dashboard__inventory-info">
                          <div className="dashboard__inventory-name">{item.product?.name ?? item.name ?? 'Unknown'}</div>
                          <div className="dashboard__inventory-bar-wrap">
                            <div className="dashboard__inventory-bar">
                              <div className={`dashboard__inventory-fill dashboard__inventory-fill--${status}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="dashboard__inventory-pct">{pct}%</span>
                          </div>
                        </div>
                        <div className="dashboard__inventory-meta">
                          <span className={`badge badge-${status === 'critical' ? 'error' : status === 'warning' ? 'warning' : 'success'}`}>
                            {stock} / {reorder}
                          </span>
                        </div>
                      </div>
                    )
                  })
            }
          </div>
        </div>

        {/* AI Insights preview */}
        <div className="dashboard__insights-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">AI Insights</h2>
              <p className="dashboard__card-sub">Latest recommendations</p>
            </div>
            <button className="dashboard__view-all" onClick={() => navigate('/insights')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard__insight-filter">
            {insightTypes.map(t => (
              <button
                key={t}
                className={`dashboard__filter-btn ${activeInsightType === t ? 'dashboard__filter-btn--active' : ''}`}
                onClick={() => setActiveInsightType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="dashboard__insights-list">
            {insLoading
              ? [1,2].map(i => <div key={i} style={{ marginBottom: 12 }}><Shimmer h={64} /></div>)
              : insights.length === 0
                ? <p style={{ fontSize: 13, color: 'var(--text-disabled)', padding: '12px 0' }}>No insights yet. <button className="btn-ghost" style={{ padding: '4px 10px' }} onClick={() => navigate('/insights')}>Generate</button></p>
                : insights.map(insight => <InsightCard key={insight.id} {...insight} />)
            }
          </div>
        </div>
      </div>
    </div>
  )
}
