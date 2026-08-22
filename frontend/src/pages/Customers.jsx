// src/pages/Customers.jsx
import { useState } from 'react'
import { useApi } from '../lib/hooks/useApi.js'
import api from '../lib/api.js'
import { Users, TrendingUp, ShoppingBag, Search, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import './Customers.css'

const fetchCustomers = (page, search, sortBy) =>
  api.get(`/customers?page=${page}&limit=20&sortBy=${sortBy}${search ? `&search=${encodeURIComponent(search)}` : ''}`).then(r => r.data)

const fmtCurrency = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function Customers() {
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery]   = useState('')
  const [sortBy, setSortBy] = useState('totalRevenue')

  const { data, loading } = useApi(() => fetchCustomers(page, query, sortBy), [page, query, sortBy])
  const customers  = data?.data?.customers  ?? data?.data ?? []
  const pagination = data?.data?.pagination ?? data?.meta ?? {}
  const summary    = data?.data?.summary    ?? {}

  const handleSearch = e => { e.preventDefault(); setQuery(search); setPage(1) }

  return (
    <div className="customers-page">
      <div className="customers-page__header">
        <div>
          <h1 className="customers-page__title">Customers</h1>
          <p className="customers-page__sub">Customer directory, purchase history, and revenue insights.</p>
        </div>
      </div>

      {/* KPI */}
      <div className="customers-kpi-grid">
        {[
          { icon: Users, label: 'Total Customers', val: (summary.totalCount ?? 0).toLocaleString(), color: '#1D4ED8', bg: '#EFF6FF' },
          { icon: TrendingUp, label: 'Total Revenue', val: fmtCurrency(summary.totalRevenue), color: '#10B981', bg: '#F0FDF4' },
          { icon: ShoppingBag, label: 'Avg. Orders', val: (summary.avgOrders ?? 0).toFixed(1), color: '#6366F1', bg: '#EEF2FF' },
          { icon: TrendingUp, label: 'Top Customer Revenue', val: fmtCurrency(summary.topRevenue), color: '#F59E0B', bg: '#FFFBEB' },
        ].map(k => (
          <div key={k.label} className="glass-card customers-kpi">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <k.icon size={20} strokeWidth={1.75} />
            </div>
            <div>
              <div className="customers-kpi__val">{k.val}</div>
              <div className="customers-kpi__label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="glass-card customers-toolbar">
        <form className="customers-search" onSubmit={handleSearch}>
          <Search size={15} style={{ color: 'var(--text-disabled)' }} />
          <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} id="customer-search" />
          <button type="submit" className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>Search</button>
        </form>
        <div className="customers-sort">
          <label style={{ fontSize: 12, color: 'var(--text-disabled)', fontWeight: 600 }}>Sort by:</label>
          <select className="customers-select" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }}>
            <option value="totalRevenue">Revenue</option>
            <option value="totalOrders">Orders</option>
            <option value="name">Name</option>
            <option value="createdAt">Date Added</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card customers-table-wrap">
        {loading ? (
          <div className="customers-loading">Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="customers-empty">
            <Users size={32} style={{ color: 'var(--text-disabled)' }} />
            <p>No customers found. Import customer data to get started.</p>
          </div>
        ) : (
          <table className="customers-tbl">
            <thead>
              <tr>{['#', 'Customer', 'Email', 'Phone', 'Total Orders', 'Total Revenue', 'Last Purchase', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {customers.map((c, i) => {
                const rev = Number(c.totalRevenue ?? 0)
                return (
                  <tr key={c.id}>
                    <td className="customers-tbl__rank">#{(page - 1) * 20 + i + 1}</td>
                    <td>
                      <div className="customers-tbl__name-cell">
                        <div className="customers-tbl__avatar">
                          {(c.name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="customers-tbl__name">{c.name ?? '—'}</div>
                          {c.company && <div className="customers-tbl__company">{c.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{c.email ?? '—'}</td>
                    <td>{c.phone ?? '—'}</td>
                    <td><strong>{(c.totalOrders ?? c._count?.sales ?? 0).toLocaleString()}</strong></td>
                    <td className="customers-tbl__revenue">{fmtCurrency(rev)}</td>
                    <td>{fmtDate(c.lastPurchaseAt ?? c.updatedAt)}</td>
                    <td>
                      <span className={`badge badge-${c.isArchived ? 'error' : 'success'}`}>
                        {c.isArchived ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {pagination.pages > 1 && (
          <div className="customers-pagination">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={15} /> Prev</button>
            <span>Page {pagination.page ?? page} of {pagination.pages ?? 1}</span>
            <button className="btn-ghost" disabled={page >= (pagination.pages ?? 1)} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={15} /></button>
          </div>
        )}
      </div>
    </div>
  )
}
