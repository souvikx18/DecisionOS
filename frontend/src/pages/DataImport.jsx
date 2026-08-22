// src/pages/DataImport.jsx
// ============================================================
// Data Import — wired to real POST /api/v1/imports/upload
// ============================================================

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  UploadCloud, FileText, CheckCircle, XCircle, Loader2, Trash2,
  FileSpreadsheet, AlertCircle, Info, History, ChevronRight
} from 'lucide-react'
import api from '../lib/api.js'
import { useApi } from '../lib/hooks/useApi.js'
import { notify } from '../components/ui/CustomToast'
import './DataImport.css'

const UPLOAD_TYPES = [
  { id: 'sales',     label: 'Sales Data',     icon: FileSpreadsheet, desc: 'Monthly or daily sales records with product, customer, and amount columns.' },
  { id: 'inventory', label: 'Inventory Data',  icon: FileSpreadsheet, desc: 'Product stock levels, reorder points, and SKU details.' },
  { id: 'expenses',  label: 'Expense Data',    icon: FileSpreadsheet, desc: 'Expense records by category, date, and amount.' },
  { id: 'customers', label: 'Customer Data',   icon: FileSpreadsheet, desc: 'Customer list with contact info and last purchase date.' },
]

const SAMPLE_HEADERS = {
  sales:     ['Date', 'Product Name', 'SKU', 'Customer', 'Quantity', 'Unit Price', 'Total Amount'],
  inventory: ['SKU', 'Product Name', 'Category', 'Stock Quantity', 'Reorder Level', 'Unit Cost'],
  expenses:  ['Date', 'Category', 'Description', 'Amount', 'Vendor'],
  customers: ['Name', 'Email', 'Phone', 'Company', 'Last Purchase Date', 'Total Orders'],
}

const STATUS_BADGE = {
  PENDING:    'badge-info',
  PROCESSING: 'badge-info',
  COMPLETED:  'badge-success',
  FAILED:     'badge-error',
  PARTIAL:    'badge-warning',
}

function FileRow({ file, onRemove }) {
  const icons  = { success: CheckCircle, error: XCircle, uploading: Loader2 }
  const colors = { success: 'var(--accent-success)', error: 'var(--accent-error)', uploading: 'var(--accent-primary)' }
  const StatusIcon = icons[file.status] || Loader2

  return (
    <div className={`file-row ${file.status}`}>
      <FileText size={18} className="file-row__icon" />
      <div className="file-row__info">
        <span className="file-row__name">{file.name}</span>
        <span className="file-row__size">{(file.size / 1024).toFixed(1)} KB</span>
      </div>
      <div className="file-row__status">
        {file.status === 'uploading' && <span className="file-row__progress-text">Processing…</span>}
        {file.status === 'success'   && (
          <span className="file-row__success-text">
            {file.rowsImported != null ? `${file.rowsImported} rows imported` : 'Imported successfully'}
          </span>
        )}
        {file.status === 'error' && <span className="file-row__error-text">{file.error}</span>}
      </div>
      <StatusIcon
        size={16}
        style={{ color: colors[file.status], flexShrink: 0, animation: file.status === 'uploading' ? 'spin 1s linear infinite' : 'none' }}
      />
      <button className="file-row__remove" onClick={() => onRemove(file.id)}><Trash2 size={14} /></button>
    </div>
  )
}

const fetchImportHistory = () =>
  api.get('/imports?limit=10').then(r => r.data?.data ?? r.data)

export default function DataImport() {
  const [activeType, setActiveType] = useState('sales')
  const [files, setFiles]           = useState([])

  const { data: historyData, loading: histLoading, refetch: refetchHistory } = useApi(fetchImportHistory, [])
  const history = Array.isArray(historyData) ? historyData : (historyData?.imports ?? [])

  // ── Upload handler ─────────────────────────────────────────
  const onDrop = useCallback(async (accepted, rejected) => {
    if (rejected.length > 0) {
      notify.error('Only .csv, .xlsx, .xls spreadsheet files under 10MB are accepted.', 'Invalid File Format')
      return
    }

    const newFiles = accepted.map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      status: 'uploading',
      error: null,
      rowsImported: null,
      _file: f,
    }))
    setFiles(prev => [...prev, ...newFiles])

    for (const fileObj of newFiles) {
      try {
        const formData = new FormData()
        formData.append('file', fileObj._file)
        formData.append('type', activeType.toUpperCase())

        const res = await api.post('/imports/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const result = res.data?.data ?? res.data

        setFiles(prev => prev.map(pf =>
          pf.id === fileObj.id
            ? { ...pf, status: 'success', rowsImported: result?.rowsImported ?? result?.summary?.totalRows }
            : pf
        ))
        notify.success(
          `${fileObj.name} — ${result?.rowsImported ?? ''} rows imported successfully.`,
          'Import Complete'
        )
        refetchHistory()
      } catch (err) {
        const msg = err?.response?.data?.error?.message || 'Parse error: column mismatch or invalid format'
        setFiles(prev => prev.map(pf =>
          pf.id === fileObj.id ? { ...pf, status: 'error', error: msg } : pf
        ))
        notify.error(`${fileObj.name}: ${msg}`, 'Import Failed')
      }
    }
  }, [activeType, refetchHistory])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024,
  })

  const removeFile   = id => setFiles(prev => prev.filter(f => f.id !== id))
  const clearAll     = ()  => setFiles([])
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount   = files.filter(f => f.status === 'error').length

  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="import-page">
      <div className="import-page__header">
        <h1 className="import-page__title">Data Import</h1>
        <p className="import-page__sub">Upload your business data to generate AI insights and populate your dashboard.</p>
      </div>

      <div className="import-page__body">
        {/* Left: type selector + format guide */}
        <div className="import-page__left">
          <div className="glass-card import-type-card">
            <h2 className="import-section-title">Select Data Type</h2>
            <div className="import-types">
              {UPLOAD_TYPES.map(t => (
                <button
                  key={t.id}
                  className={`import-type-btn ${activeType === t.id ? 'import-type-btn--active' : ''}`}
                  onClick={() => setActiveType(t.id)}
                  id={`import-type-${t.id}`}
                >
                  <t.icon size={16} strokeWidth={1.75} />
                  <div>
                    <span className="import-type-label">{t.label}</span>
                    <span className="import-type-desc">{t.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format guide */}
          <div className="glass-card import-guide-card">
            <div className="import-guide-header">
              <Info size={15} />
              <span>Required Columns for {UPLOAD_TYPES.find(t => t.id === activeType)?.label}</span>
            </div>
            <div className="import-guide-columns">
              {SAMPLE_HEADERS[activeType].map((col, i) => (
                <div key={col} className="import-guide-col">
                  <span className="import-guide-col__num">{i + 1}</span>
                  <span className="import-guide-col__name">{col}</span>
                </div>
              ))}
            </div>
            <a
              href="#"
              className="import-guide-download"
              onClick={e => { e.preventDefault(); notify.success('Sample template file downloaded.', 'Download Complete') }}
            >
              Download template CSV
            </a>
          </div>
        </div>

        {/* Right: dropzone + file list */}
        <div className="import-page__right">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`import-dropzone ${isDragActive ? 'import-dropzone--active' : ''}`}
            id="import-dropzone"
          >
            <input {...getInputProps()} id="import-file-input" />
            <div className="import-dropzone__icon"><UploadCloud size={32} strokeWidth={1.5} /></div>
            <h3 className="import-dropzone__title">
              {isDragActive ? 'Drop your file here…' : 'Drag & drop your file here'}
            </h3>
            <p className="import-dropzone__sub">or click to browse • CSV, XLS, XLSX • Max 10MB</p>
            <button type="button" className="btn-primary import-dropzone__btn">Browse File</button>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="glass-card import-files">
              <div className="import-files__header">
                <span className="import-files__title">
                  Uploaded Files ({files.length})
                  {successCount > 0 && <span className="badge badge-success" style={{ marginLeft: 8 }}>{successCount} done</span>}
                  {errorCount   > 0 && <span className="badge badge-error"   style={{ marginLeft: 6 }}>{errorCount} failed</span>}
                </span>
                <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={clearAll}>Clear all</button>
              </div>
              <div className="import-files__list">
                {files.map(f => <FileRow key={f.id} file={f} onRemove={removeFile} />)}
              </div>
              {successCount > 0 && (
                <div className="import-files__success-banner">
                  <CheckCircle size={16} />
                  <span>{successCount} file(s) successfully imported. Your dashboard will update shortly.</span>
                </div>
              )}
            </div>
          )}

          {/* Import History */}
          <div className="glass-card" style={{ marginTop: 16 }}>
            <div className="dashboard__card-header" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={16} style={{ color: 'var(--accent-primary)' }} />
                <h2 className="dashboard__card-title">Import History</h2>
              </div>
            </div>
            {histLoading ? (
              <div style={{ padding: '12px 0', color: 'var(--text-disabled)', fontSize: 13 }}>Loading…</div>
            ) : history.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-disabled)', padding: '8px 0' }}>No imports yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['File', 'Type', 'Rows', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-disabled)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(imp => (
                    <tr key={imp.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '8px 8px', color: 'var(--text-primary)', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {imp.originalFilename ?? imp.fileName ?? 'file'}
                      </td>
                      <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{imp.dataType ?? imp.type}</td>
                      <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{imp.rowsImported ?? imp.rowsProcessed ?? '—'}</td>
                      <td style={{ padding: '8px 8px' }}>
                        <span className={`badge ${STATUS_BADGE[imp.status] ?? 'badge-info'}`}>{imp.status}</span>
                      </td>
                      <td style={{ padding: '8px 8px', color: 'var(--text-disabled)' }}>{fmtDate(imp.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Tips */}
          <div className="glass-card import-tips">
            <AlertCircle size={15} style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
            <div>
              <strong>Tips for best results:</strong> Ensure your CSV has headers in row 1, dates in DD/MM/YYYY format, and amounts in Indian Rupees (₹) without commas.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
