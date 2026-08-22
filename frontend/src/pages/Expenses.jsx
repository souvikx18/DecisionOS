// src/pages/Expenses.jsx
import { useState } from 'react'
import { useApi } from '../lib/hooks/useApi.js'
import api from '../lib/api.js'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CreditCard, Search, ChevronLeft, ChevronRight, TrendingDown } from 'lucide-react'
import './Expenses.css'

const COLORS = ['#1D4ED8', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#64748B', '#EC4899', '#0EA5E9']

const fetchExpenses = (page, category) =>
  api.get(`/expenses?page=${page}&limit=20${category ? `&category=${encodeURIComponent(category)}` : ''}`).then(r => r.data)

const fetchCategories = () =>
  api.get('/expenses/categories').then(r => r.data?.data ?? r.data)

const fmtCurrency = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function Expenses() {
  const [page, setPage]     = useState(1)
  const [category, setCat]  = useState('')

  const { data, loading }        = useApi(() => fetchExpenses(page, category), [page, category])
  const { data: catData }        = useApi(fetchCategories, [])

  const expenses   = data?.data?.expenses   ?? data?.data ?? []
  const pagination = data?.data?.pagination ?? data?.meta  ?? {}
  const summary    = data?.data?.summary    ?? {}
  const categories = catData ?? []

  const pieData = categories.map((c, i) => ({
    name: c.category, value: Number(c._sum?.amount ?? c.amount ?? 0), fill: COLORS[i % COLORS.length]
  }))

  return (
    <div className="expenses-page">
      <div className="expenses-page__header">
        <div>
          <h1 className="expenses-page__title">Expenses</h1>
          <p className="expenses-page__sub">Track and analyze your business expenditure.</p>
        </div>
      </div>

      {/* KPI + Chart row */}
      <div className="expenses-top-row">
        <div className="glass-card expenses-kpi-col">
          <div className="expenses-kpi">
            <div className="expenses-kpi__icon"><CreditCard size={20} strokeWidth={1.75} /></div>
            <div>
              <div className="expenses-kpi__val">{fmtCurrency(summary.totalExpenses)}</div>
              <div className="expenses-kpi__label">Total Expenses</div>
            </div>
          </div>
          <div className="expenses-kpi" style={{ marginTop: 16 }}>
            <div className="expenses-kpi__icon" style={{ background: '#FEF2F2', color: '#EF4444' }}>
              <TrendingDown size={20} strokeWidth={1.75} />
            </div>
            <div>
              <div className="expenses-kpi__val">{fmtCurrency(summary.avgMonthly)}</div>
              <div className="expenses-kpi__label">Avg. Monthly Expense</div>
            </div>
          </div>
        </div>

        <div className="glass-card expenses-chart-col">
          <h3 className="expenses-chart-title">By Category</h3>
          {pieData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)', fontSize: 13 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={v => fmtCurrency(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="glass-card expenses-toolbar">
        <Search size={15} style={{ color: 'var(--text-disabled)' }} />
        <select
          className="expenses-select"
          value={category}
          onChange={e => { setCat(e.target.value); setPage(1) }}
          id="expenses-cat-filter"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.category} value={c.category}>{c.category}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card expenses-table-wrap">
        {loading ? (
          <div className="expenses-loading">Loading expenses…</div>
        ) : expenses.length === 0 ? (
          <div className="expenses-empty">
            <CreditCard size={32} style={{ color: 'var(--text-disabled)' }} />
            <p>No expenses found.</p>
          </div>
        ) : (
          <table className="expenses-tbl">
            <thead>
              <tr>
                {['Date', 'Category', 'Description', 'Vendor', 'Amount'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td>{fmtDate(e.occurredAt ?? e.createdAt)}</td>
                  <td><span className="badge badge-info">{e.category}</span></td>
                  <td>{e.description ?? '—'}</td>
                  <td>{e.vendor ?? '—'}</td>
                  <td className="expenses-tbl__amount">{fmtCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination.pages > 1 && (
          <div className="expenses-pagination">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={15} /> Prev
            </button>
            <span>Page {pagination.page ?? page} of {pagination.pages ?? 1}</span>
            <button className="btn-ghost" disabled={page >= (pagination.pages ?? 1)} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
