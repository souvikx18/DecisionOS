// src/pages/Inventory.jsx
import { useState } from 'react'
import { useApi } from '../lib/hooks/useApi.js'
import api from '../lib/api.js'
import { Package, AlertTriangle, Search, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import './Inventory.css'

const fetchInventory = (page, search, lowStock) =>
  api.get(`/inventory?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}${lowStock ? '&lowStock=true' : ''}`).then(r => r.data)

const fmtCurrency = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

function StockBar({ quantity, reorderLevel }) {
  const pct = Math.min(100, Math.round((quantity / Math.max(reorderLevel, 1)) * 100))
  const color = pct <= 25 ? '#EF4444' : pct <= 60 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

export default function Inventory() {
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [query, setQuery]       = useState('')
  const [lowStock, setLowStock] = useState(false)

  const { data, loading } = useApi(() => fetchInventory(page, query, lowStock), [page, query, lowStock])
  const items      = data?.data?.items      ?? data?.data ?? []
  const pagination = data?.data?.pagination ?? data?.meta ?? {}
  const summary    = data?.data?.summary    ?? {}

  const handleSearch = e => { e.preventDefault(); setQuery(search); setPage(1) }

  return (
    <div className="inventory-page">
      <div className="inventory-page__header">
        <div>
          <h1 className="inventory-page__title">Inventory</h1>
          <p className="inventory-page__sub">Stock levels, reorder alerts, and product inventory.</p>
        </div>
      </div>

      <div className="inventory-kpi-grid">
        {[
          { icon: Package, label: 'Total SKUs', val: (summary.totalItems ?? 0).toLocaleString(), color: '#1D4ED8', bg: '#EFF6FF' },
          { icon: AlertTriangle, label: 'Critical (≤25%)', val: summary.criticalCount ?? 0, color: '#EF4444', bg: '#FEF2F2' },
          { icon: AlertTriangle, label: 'Low Stock (≤60%)', val: summary.warningCount ?? 0, color: '#F59E0B', bg: '#FFFBEB' },
          { icon: CheckCircle, label: 'Healthy Stock', val: summary.okCount ?? 0, color: '#10B981', bg: '#F0FDF4' },
        ].map(k => (
          <div key={k.label} className="glass-card inventory-kpi">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <k.icon size={20} strokeWidth={1.75} />
            </div>
            <div>
              <div className="inventory-kpi__val" style={{ color: k.color }}>{k.val}</div>
              <div className="inventory-kpi__label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card inventory-toolbar">
        <form className="inventory-search" onSubmit={handleSearch}>
          <Search size={15} style={{ color: 'var(--text-disabled)' }} />
          <input type="text" placeholder="Search by product name or SKU…" value={search} onChange={e => setSearch(e.target.value)} id="inventory-search" />
          <button type="submit" className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>Search</button>
        </form>
        <label className="inventory-filter-toggle" htmlFor="low-stock-filter">
          <input id="low-stock-filter" type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1) }} />
          Alerts only
        </label>
      </div>

      <div className="glass-card inventory-table-wrap">
        {loading ? (
          <div className="inventory-loading">Loading inventory…</div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <Package size={32} style={{ color: 'var(--text-disabled)' }} />
            <p>No inventory data found. Import inventory data to get started.</p>
          </div>
        ) : (
          <table className="inventory-tbl">
            <thead>
              <tr>{['Product', 'SKU', 'Category', 'In Stock', 'Reorder At', 'Stock Level', 'Unit Cost', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(item => {
                const qty     = item.quantity ?? 0
                const reorder = item.reorderLevel ?? 0
                const pct     = Math.min(100, Math.round((qty / Math.max(reorder, 1)) * 100))
                const status  = pct <= 25 ? 'critical' : pct <= 60 ? 'warning' : 'ok'
                return (
                  <tr key={item.id}>
                    <td className="inventory-tbl__name">{item.product?.name ?? item.name ?? '—'}</td>
                    <td className="inventory-tbl__sku">{item.product?.sku ?? item.sku ?? '—'}</td>
                    <td>{item.product?.category ?? item.category ?? '—'}</td>
                    <td><strong>{qty.toLocaleString()}</strong></td>
                    <td>{reorder.toLocaleString()}</td>
                    <td style={{ minWidth: 130 }}><StockBar quantity={qty} reorderLevel={reorder} /></td>
                    <td>{fmtCurrency(item.unitCost ?? item.product?.costPrice)}</td>
                    <td>
                      <span className={`badge badge-${status === 'critical' ? 'error' : status === 'warning' ? 'warning' : 'success'}`}>
                        {status === 'critical' ? 'Critical' : status === 'warning' ? 'Low' : 'OK'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {pagination.pages > 1 && (
          <div className="inventory-pagination">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={15} /> Prev</button>
            <span>Page {pagination.page ?? page} of {pagination.pages ?? 1}</span>
            <button className="btn-ghost" disabled={page >= (pagination.pages ?? 1)} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={15} /></button>
          </div>
        )}
      </div>
    </div>
  )
}
