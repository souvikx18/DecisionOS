// src/pages/Sales.jsx
import { useState } from 'react'
import { useApi } from '../lib/hooks/useApi.js'
import api from '../lib/api.js'
import { ShoppingCart, TrendingUp, DollarSign, Package, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import './Sales.css'

const fetchSales = (page, search) =>
  api.get(`/sales?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`).then(r => r.data)

const fmtCurrency = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function Sales() {
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [query, setQuery]     = useState('')

  const { data, loading } = useApi(() => fetchSales(page, query), [page, query])
  const sales      = data?.data?.sales      ?? data?.data ?? []
  const pagination = data?.data?.pagination ?? data?.meta ?? {}
  const summary    = data?.data?.summary    ?? {}

  const handleSearch = e => { e.preventDefault(); setQuery(search); setPage(1) }

  const KPI = ({ icon: Icon, label, value, color }) => (
    <div className="glass-card sales-kpi">
      <div className="sales-kpi__icon" style={{ background: `${color}18`, color }}>
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div>
        <div className="sales-kpi__val">{value}</div>
        <div className="sales-kpi__label">{label}</div>
      </div>
    </div>
  )

  return (
    <div className="sales-page">
      <div className="sales-page__header">
        <div>
          <h1 className="sales-page__title">Sales</h1>
          <p className="sales-page__sub">All sales transactions for your organization.</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="sales-kpi-grid">
        <KPI icon={DollarSign} label="Total Revenue"      value={fmtCurrency(summary.totalRevenue)}    color="#1D4ED8" />
        <KPI icon={ShoppingCart} label="Total Transactions" value={(summary.totalCount ?? 0).toLocaleString()} color="#10B981" />
        <KPI icon={TrendingUp} label="Avg. Order Value"   value={fmtCurrency(summary.avgOrderValue)}   color="#6366F1" />
        <KPI icon={Package} label="Products Sold"      value={(summary.uniqueProducts ?? 0).toLocaleString()} color="#F59E0B" />
      </div>

      {/* Search */}
      <div className="glass-card sales-toolbar">
        <form className="sales-search" onSubmit={handleSearch}>
          <Search size={15} style={{ color: 'var(--text-disabled)' }} />
          <input
            type="text" placeholder="Search by customer or product…"
            value={search} onChange={e => setSearch(e.target.value)}
            id="sales-search-input"
          />
          <button type="submit" className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>Search</button>
        </form>
      </div>

      {/* Table */}
      <div className="glass-card sales-table-wrap">
        {loading ? (
          <div className="sales-loading">Loading transactions…</div>
        ) : sales.length === 0 ? (
          <div className="sales-empty">
            <ShoppingCart size={32} style={{ color: 'var(--text-disabled)' }} />
            <p>No sales found. Import your sales data to get started.</p>
          </div>
        ) : (
          <table className="sales-tbl">
            <thead>
              <tr>
                {['Date', 'Customer', 'Product', 'Qty', 'Unit Price', 'Total', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td>{fmtDate(s.soldAt ?? s.createdAt)}</td>
                  <td>{s.customer?.name ?? s.customerName ?? '—'}</td>
                  <td>{s.product?.name ?? s.productName ?? s.description ?? '—'}</td>
                  <td>{s.quantity ?? 1}</td>
                  <td>{fmtCurrency(s.unitPrice)}</td>
                  <td className="sales-tbl__amount">{fmtCurrency(s.totalAmount)}</td>
                  <td>
                    <span className={`badge badge-${s.status === 'COMPLETED' ? 'success' : s.status === 'PENDING' ? 'warning' : 'info'}`}>
                      {s.status ?? 'COMPLETED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="sales-pagination">
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
