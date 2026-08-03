import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import StatCard from '../components/ui/StatCard'
import InsightCard from '../components/ui/InsightCard'
import {
  mockRevenue, mockSales, mockExpenses, mockInventoryAlerts,
  mockSalesTrend, mockExpenseTrend, mockTopCustomers,
  mockInventoryStatus, mockAIInsights
} from '../data/mockData'
import {
  DollarSign, ShoppingCart, CreditCard, AlertTriangle,
  TrendingUp, Package, ChevronRight, ArrowUpRight
} from 'lucide-react'
import './Dashboard.css'

// Custom chart tooltip
const ChartTooltip = ({ active, payload, label, prefix = '₹' }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <strong>{prefix}{(p.value / 100000).toFixed(2)}L</strong>
        </div>
      ))}
    </div>
  )
}

const fmtAmount = v => `₹${(v / 100000).toFixed(1)}L`
const AXIS_STYLE = { fill: '#475569', fontSize: 11 }

const SALES_COMBINED = [
  ...mockSalesTrend,
  { month: 'Aug (P)', revenue: 5100000, target: 5000000, predicted: true },
  { month: 'Sep (P)', revenue: 5350000, target: 5200000, predicted: true },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeInsightType, setActiveInsightType] = useState('all')

  const insightTypes = ['all', 'sales', 'inventory', 'churn', 'expense']
  const filteredInsights = activeInsightType === 'all'
    ? mockAIInsights.slice(0, 4)
    : mockAIInsights.filter(i => i.type === activeInsightType).slice(0, 4)

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
        <StatCard
          icon={DollarSign} label="Total Revenue" value={mockRevenue.total}
          change={mockRevenue.change} changeLabel={mockRevenue.changeLabel} color="blue" prefix="" />
        <StatCard
          icon={ShoppingCart} label="Total Sales" value={mockSales.total}
          change={mockSales.change} changeLabel={mockSales.changeLabel} color="green" />
        <StatCard
          icon={CreditCard} label="Total Expenses" value={mockExpenses.total}
          change={mockExpenses.change} changeLabel={mockExpenses.changeLabel} color="amber" prefix="" />
        <StatCard
          icon={AlertTriangle} label="Inventory Alerts" value={mockInventoryAlerts.total}
          changeLabel={mockInventoryAlerts.changeLabel} color="red" />
      </div>

      {/* Charts row */}
      <div className="dashboard__charts-row">
        {/* Sales trend */}
        <div className="dashboard__chart-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">Revenue Trend</h2>
              <p className="dashboard__card-sub">Actual vs target + 2-month AI prediction</p>
            </div>
            <button className="dashboard__view-all" onClick={() => navigate('/reports')}>
              View Report <ChevronRight size={14} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={SALES_COMBINED} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EA" opacity={0.5} />
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtAmount} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
              <ReferenceLine x="Aug (P)" stroke="#DDE3EA" strokeDasharray="4 4" label={{ value: 'Predicted', fill: '#94A3B8', fontSize: 10, position: 'top' }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1D4ED8" strokeWidth={2.5} dot={{ r: 3, fill: '#1D4ED8' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="target"  name="Target"  stroke="#DDE3EA" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense breakdown */}
        <div className="dashboard__chart-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">Expense Breakdown</h2>
              <p className="dashboard__card-sub">By category over last 6 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockExpenseTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EA" opacity={0.5} />
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
              <Bar dataKey="logistics"   name="Logistics"   fill="#1D4ED8" radius={[3,3,0,0]} />
              <Bar dataKey="salaries"    name="Salaries"    fill="#6366F1" radius={[3,3,0,0]} />
              <Bar dataKey="marketing"   name="Marketing"   fill="#10B981" radius={[3,3,0,0]} />
              <Bar dataKey="operations"  name="Operations"  fill="#64748B" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="dashboard__bottom-row">
        {/* Top customers */}
        <div className="dashboard__table-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">Top Customers</h2>
              <p className="dashboard__card-sub">By revenue this month</p>
            </div>
            <button className="dashboard__view-all" onClick={() => navigate('/insights')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard__customer-list">
            {mockTopCustomers.map(c => (
              <div key={c.rank} className="dashboard__customer-row">
                <div className="dashboard__customer-rank">#{c.rank}</div>
                <div className="dashboard__customer-avatar">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="dashboard__customer-info">
                  <span className="dashboard__customer-name">{c.name}</span>
                  <span className="dashboard__customer-orders">{c.orders} orders</span>
                </div>
                <div className="dashboard__customer-rev">
                  <span className="dashboard__customer-amount">₹{(c.revenue / 100000).toFixed(2)}L</span>
                  <span className={`dashboard__customer-change ${c.change >= 0 ? 'up' : 'down'}`}>
                    <ArrowUpRight size={10} style={{ transform: c.change < 0 ? 'rotate(90deg)' : 'none' }} />
                    {Math.abs(c.change)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory status */}
        <div className="dashboard__table-card glass-card">
          <div className="dashboard__card-header">
            <div>
              <h2 className="dashboard__card-title">Inventory Status</h2>
              <p className="dashboard__card-sub">Items near or below reorder level</p>
            </div>
            <button className="dashboard__view-all" onClick={() => navigate('/insights')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="dashboard__inventory-list">
            {mockInventoryStatus.map(item => {
              const pct = Math.min(100, Math.round((item.stock / item.reorder) * 100))
              return (
                <div key={item.name} className="dashboard__inventory-row">
                  <div className="dashboard__inventory-icon">
                    <Package size={14} />
                  </div>
                  <div className="dashboard__inventory-info">
                    <div className="dashboard__inventory-name">{item.name}</div>
                    <div className="dashboard__inventory-bar-wrap">
                      <div className="dashboard__inventory-bar">
                        <div
                          className={`dashboard__inventory-fill dashboard__inventory-fill--${item.status}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="dashboard__inventory-pct">{pct}%</span>
                    </div>
                  </div>
                  <div className="dashboard__inventory-meta">
                    <span className={`badge badge-${item.status === 'critical' ? 'error' : item.status === 'warning' ? 'warning' : 'success'}`}>
                      {item.status === 'ok' ? `${item.daysLeft}d` : `${item.daysLeft}d left`}
                    </span>
                  </div>
                </div>
              )
            })}
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
            {filteredInsights.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-disabled)', padding: '12px 0' }}>No insights for this category.</p>
              : filteredInsights.map(insight => (
                  <InsightCard key={insight.id} {...insight} />
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
