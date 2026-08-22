// src/pages/Reports.jsx
// ============================================================
// Reports — 3-tab: Generate | History | Schedules
// Wired to real backend reports API
// ============================================================

import { useState } from 'react'
import {
  FileText, Download, Calendar, Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, CheckCircle, XCircle, Clock, FileSpreadsheet,
  FileBarChart2, ChevronDown, ChevronUp, Bell
} from 'lucide-react'
import {
  useReports, useSchedules, useGenerateReport, useCreateSchedule,
  fetchDownloadUrl, deleteReport, deleteSchedule, updateSchedule,
} from '../lib/hooks/useReports.js'
import { notify } from '../components/ui/CustomToast'
import './Reports.css'

// ── Constants ──────────────────────────────────────────────────

const TABS = [
  { id: 'generate', label: 'Generate Report', icon: FileBarChart2 },
  { id: 'history',  label: 'History',          icon: Clock },
  { id: 'schedules',label: 'Schedules',         icon: Calendar },
]

const REPORT_TYPES = [
  { id: 'DAILY_SUMMARY',  label: 'Daily Summary'   },
  { id: 'WEEKLY_REPORT',  label: 'Weekly Report'   },
  { id: 'MONTHLY_REPORT', label: 'Monthly Report'  },
  { id: 'CUSTOM',         label: 'Custom Range'    },
]

const FREQUENCIES = [
  { id: 'DAILY',   label: 'Daily'   },
  { id: 'WEEKLY',  label: 'Weekly'  },
  { id: 'MONTHLY', label: 'Monthly' },
]

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const FORMAT_META = {
  PDF:  { label: 'PDF',  color: '#EF4444', icon: FileText },
  XLSX: { label: 'XLSX', color: '#10B981', icon: FileSpreadsheet },
  CSV:  { label: 'CSV',  color: '#6366F1', icon: FileText },
}

const STATUS_META = {
  PENDING:    { label: 'Pending',    cls: 'badge-info',    icon: Clock },
  GENERATING: { label: 'Generating', cls: 'badge-info',    icon: Loader2 },
  READY:      { label: 'Ready',      cls: 'badge-success', icon: CheckCircle },
  FAILED:     { label: 'Failed',     cls: 'badge-error',   icon: XCircle },
}

const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtDateTime = d => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ── Sub-components ─────────────────────────────────────────────

function FormatToggle({ selected, onChange }) {
  return (
    <div className="rpt-format-toggle">
      {Object.entries(FORMAT_META).map(([fmt, meta]) => (
        <button
          key={fmt}
          className={`rpt-fmt-btn ${selected.includes(fmt) ? 'rpt-fmt-btn--active' : ''}`}
          style={{ '--fmt-color': meta.color }}
          onClick={() => onChange(prev =>
            prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
          )}
          id={`fmt-${fmt.toLowerCase()}`}
        >
          <meta.icon size={13} />
          {meta.label}
        </button>
      ))}
    </div>
  )
}

function ProgressBar({ status }) {
  const pct = { PENDING: 10, GENERATING: 60, READY: 100, FAILED: 100 }[status] ?? 10
  const color = status === 'FAILED' ? '#EF4444' : status === 'READY' ? '#10B981' : '#1D4ED8'
  return (
    <div style={{ height: 6, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden', margin: '12px 0' }}>
      <div style={{
        height: '100%', width: `${pct}%`, background: color, borderRadius: 4,
        transition: 'width 0.5s ease',
        animation: status === 'GENERATING' ? 'progressPulse 1.5s ease-in-out infinite' : 'none'
      }} />
    </div>
  )
}

// ── Tab 1: Generate ────────────────────────────────────────────

function GenerateTab({ onGenerated }) {
  const today = new Date().toISOString().slice(0, 16)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 16)

  const [reportType, setReportType]   = useState('MONTHLY_REPORT')
  const [periodStart, setPeriodStart] = useState(monthAgo)
  const [periodEnd, setPeriodEnd]     = useState(today)
  const [formats, setFormats]         = useState(['XLSX'])
  const [emailTo, setEmailTo]         = useState('')

  const { generating, report, error, generate } = useGenerateReport()

  const handleGenerate = async () => {
    if (formats.length === 0) {
      notify.error('Select at least one format (XLSX, PDF, or CSV)', 'Select Format')
      return
    }
    try {
      const emails = emailTo.trim()
        ? emailTo.split(',').map(e => e.trim()).filter(Boolean)
        : []
      const result = await generate({ type: reportType, periodStart, periodEnd, formats, emailTo: emails })
      notify.success(`${result.title} is ready for download.`, 'Report Ready ✅')
      onGenerated()
    } catch (err) {
      notify.error(err.message || 'Generation failed', 'Report Failed')
    }
  }

  return (
    <div className="rpt-generate-form glass-card">
      <h2 className="rpt-section-title">New Report</h2>

      {/* Report type */}
      <div className="rpt-field">
        <label className="rpt-label">Report Type</label>
        <div className="rpt-type-grid">
          {REPORT_TYPES.map(t => (
            <button
              key={t.id}
              className={`rpt-type-btn ${reportType === t.id ? 'rpt-type-btn--active' : ''}`}
              onClick={() => setReportType(t.id)}
              id={`rtype-${t.id.toLowerCase()}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period */}
      <div className="rpt-field rpt-field--row">
        <div style={{ flex: 1 }}>
          <label className="rpt-label">Period Start</label>
          <input
            type="datetime-local" className="rpt-input"
            value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            id="rpt-period-start"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="rpt-label">Period End</label>
          <input
            type="datetime-local" className="rpt-input"
            value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            id="rpt-period-end"
          />
        </div>
      </div>

      {/* Format */}
      <div className="rpt-field">
        <label className="rpt-label">Export Format <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>(select one or more)</span></label>
        <FormatToggle selected={formats} onChange={setFormats} />
      </div>

      {/* Email */}
      <div className="rpt-field">
        <label className="rpt-label">Email Report To <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>(optional — comma-separated)</span></label>
        <input
          type="text" className="rpt-input"
          placeholder="admin@yourco.com, cfo@yourco.com"
          value={emailTo} onChange={e => setEmailTo(e.target.value)}
          id="rpt-email-to"
        />
      </div>

      {/* Progress / error */}
      {generating && (
        <div className="rpt-progress-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--accent-primary)', marginBottom: 6 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Generating your report — this may take 10–30 seconds…
          </div>
          <ProgressBar status="GENERATING" />
        </div>
      )}
      {report?.status === 'READY' && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 }}>
          <CheckCircle size={14} style={{ color: '#10B981', marginRight: 6 }} />
          <strong>{report.title}</strong> — ready. Go to History tab to download.
        </div>
      )}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13, color: '#991B1B' }}>
          <XCircle size={14} style={{ marginRight: 6 }} /> {error}
        </div>
      )}

      <button
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
        onClick={handleGenerate}
        disabled={generating}
        id="generate-report-btn"
      >
        {generating
          ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
          : <><FileBarChart2 size={15} /> Generate Report</>
        }
      </button>
    </div>
  )
}

// ── Tab 2: History ─────────────────────────────────────────────

function HistoryTab() {
  const { data, loading, refetch } = useReports({ limit: 20 })
  const [downloading, setDownloading] = useState({})
  const [deleting, setDeleting]       = useState({})

  const reports = Array.isArray(data) ? data : (data?.reports ?? [])

  const handleDownload = async (reportId, exportId, format) => {
    setDownloading(d => ({ ...d, [exportId]: true }))
    try {
      const result = await fetchDownloadUrl(reportId, exportId)
      const url = result?.download?.signedUrl ?? result?.signedUrl
      if (!url) throw new Error('No download URL returned')
      window.open(url, '_blank')
    } catch {
      notify.error('Could not fetch download link. Try again.', 'Download Failed')
    } finally {
      setDownloading(d => ({ ...d, [exportId]: false }))
    }
  }

  const handleDelete = async (reportId) => {
    if (!window.confirm('Delete this report and all exported files?')) return
    setDeleting(d => ({ ...d, [reportId]: true }))
    try {
      await deleteReport(reportId)
      notify.success('Report deleted.', 'Deleted')
      refetch()
    } catch {
      notify.error('Could not delete report.', 'Error')
    } finally {
      setDeleting(d => ({ ...d, [reportId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="rpt-history">
        {[1,2,3].map(i => (
          <div key={i} className="glass-card rpt-history-row" style={{ padding: 16 }}>
            <div style={{ height: 20, background: '#E2E8F0', borderRadius: 4, width: '60%', marginBottom: 8 }} />
            <div style={{ height: 14, background: '#F1F5F9', borderRadius: 4, width: '30%' }} />
          </div>
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="glass-card rpt-empty">
        <FileBarChart2 size={36} style={{ color: 'var(--text-disabled)', marginBottom: 12 }} />
        <p>No reports generated yet.</p>
        <span>Switch to the Generate tab to create your first report.</span>
      </div>
    )
  }

  return (
    <div className="rpt-history">
      {reports.map(rep => {
        const sm = STATUS_META[rep.status] ?? STATUS_META.PENDING
        const StatusIcon = sm.icon
        return (
          <div key={rep.id} className="glass-card rpt-history-row">
            <div className="rpt-history-row__left">
              <div className="rpt-history-title">{rep.title}</div>
              <div className="rpt-history-meta">
                <span className={`badge ${sm.cls}`}>
                  <StatusIcon size={10} style={{ marginRight: 4, animation: rep.status === 'GENERATING' ? 'spin 1s linear infinite' : 'none' }} />
                  {sm.label}
                </span>
                <span className="rpt-history-date">{fmtDateTime(rep.createdAt)}</span>
                <span className="rpt-history-period">
                  {fmtDate(rep.periodStart)} – {fmtDate(rep.periodEnd)}
                </span>
              </div>
            </div>
            <div className="rpt-history-row__right">
              {/* Download buttons per export */}
              {(rep.exports ?? []).map(exp => {
                const fmeta = FORMAT_META[exp.format] ?? FORMAT_META.XLSX
                const isExpired = exp.storageKey === ''
                return (
                  <button
                    key={exp.id}
                    className="rpt-dl-btn"
                    style={{ '--fmt-color': fmeta.color }}
                    disabled={downloading[exp.id] || isExpired || rep.status !== 'READY'}
                    onClick={() => handleDownload(rep.id, exp.id, exp.format)}
                    title={isExpired ? 'File expired (30-day retention)' : `Download ${exp.format}`}
                    id={`dl-${exp.id}`}
                  >
                    {downloading[exp.id]
                      ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Download size={12} />
                    }
                    {exp.format}
                    {isExpired && ' (expired)'}
                  </button>
                )
              })}
              <button
                className="rpt-del-btn"
                onClick={() => handleDelete(rep.id)}
                disabled={deleting[rep.id]}
                title="Delete report"
              >
                {deleting[rep.id] ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tab 3: Schedules ───────────────────────────────────────────

function SchedulesTab() {
  const { data: schedData, loading, refetch } = useSchedules()
  const { creating, error: createError, create } = useCreateSchedule()
  const [showForm, setShowForm] = useState(false)
  const [toggling, setToggling] = useState({})
  const [deleting, setDeleting] = useState({})

  // Form state
  const [form, setForm] = useState({
    type: 'MONTHLY_REPORT', frequency: 'MONTHLY',
    formats: ['XLSX'], emailTo: '', dayOfWeek: 1, dayOfMonth: 1,
  })

  const schedules = Array.isArray(schedData) ? schedData : (schedData?.schedules ?? schedData ?? [])

  const handleCreate = async () => {
    if (!form.emailTo.trim()) { notify.error('At least one recipient email is required.', 'Missing Email'); return }
    if (form.formats.length === 0) { notify.error('Select at least one format.', 'Missing Format'); return }
    try {
      const payload = {
        type: form.type, frequency: form.frequency,
        formats: form.formats,
        emailTo: form.emailTo.split(',').map(e => e.trim()).filter(Boolean),
        ...(form.frequency === 'WEEKLY' ? { dayOfWeek: Number(form.dayOfWeek) } : {}),
        ...(form.frequency === 'MONTHLY' ? { dayOfMonth: Number(form.dayOfMonth) } : {}),
      }
      await create(payload)
      notify.success(`${form.frequency} schedule created.`, 'Schedule Active ✅')
      setShowForm(false)
      refetch()
    } catch (err) {
      notify.error(err.message || 'Could not create schedule', 'Error')
    }
  }

  const handleToggle = async (sched) => {
    setToggling(t => ({ ...t, [sched.id]: true }))
    try {
      await updateSchedule(sched.id, { isActive: !sched.isActive })
      notify.success(`Schedule ${sched.isActive ? 'paused' : 'activated'}.`, 'Updated')
      refetch()
    } catch { notify.error('Could not update schedule.', 'Error') }
    finally { setToggling(t => ({ ...t, [sched.id]: false })) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule permanently?')) return
    setDeleting(d => ({ ...d, [id]: true }))
    try {
      await deleteSchedule(id)
      notify.success('Schedule deleted.', 'Deleted')
      refetch()
    } catch { notify.error('Could not delete schedule.', 'Error') }
    finally { setDeleting(d => ({ ...d, [id]: false })) }
  }

  const fmtFreq = (sched) => {
    if (sched.frequency === 'WEEKLY') return `Weekly · ${DAY_NAMES[sched.dayOfWeek ?? 1]}s`
    if (sched.frequency === 'MONTHLY') return `Monthly · Day ${sched.dayOfMonth}`
    return 'Daily'
  }

  return (
    <div className="rpt-schedules">
      {/* New schedule button */}
      <button
        className="btn-primary"
        style={{ marginBottom: 16 }}
        onClick={() => setShowForm(s => !s)}
        id="new-schedule-btn"
      >
        {showForm ? <ChevronUp size={14} /> : <Plus size={14} />}
        {showForm ? 'Cancel' : 'New Schedule'}
      </button>

      {/* Create form */}
      {showForm && (
        <div className="glass-card rpt-schedule-form">
          <h3 className="rpt-section-title" style={{ marginBottom: 16 }}>Schedule Configuration</h3>

          <div className="rpt-field">
            <label className="rpt-label">Report Type</label>
            <select className="rpt-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {REPORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div className="rpt-field">
            <label className="rpt-label">Frequency</label>
            <div className="rpt-type-grid">
              {FREQUENCIES.map(f => (
                <button key={f.id} className={`rpt-type-btn ${form.frequency === f.id ? 'rpt-type-btn--active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, frequency: f.id }))}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {form.frequency === 'WEEKLY' && (
            <div className="rpt-field">
              <label className="rpt-label">Day of Week</label>
              <div className="rpt-type-grid">
                {DAY_NAMES.map((d, i) => (
                  <button key={d} className={`rpt-type-btn ${form.dayOfWeek === i ? 'rpt-type-btn--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, dayOfWeek: i }))} style={{ minWidth: 44 }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.frequency === 'MONTHLY' && (
            <div className="rpt-field">
              <label className="rpt-label">Day of Month</label>
              <input type="number" className="rpt-input" min={1} max={28}
                value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: Number(e.target.value) }))}
                style={{ width: 80 }} />
              <span style={{ fontSize: 12, color: 'var(--text-disabled)', marginLeft: 8 }}>1–28</span>
            </div>
          )}

          <div className="rpt-field">
            <label className="rpt-label">Export Format</label>
            <FormatToggle selected={form.formats} onChange={fns => setForm(f => ({ ...f, formats: typeof fns === 'function' ? fns(f.formats) : fns }))} />
          </div>

          <div className="rpt-field">
            <label className="rpt-label">Send Report To <span style={{ color: 'var(--accent-error)' }}>*</span></label>
            <input type="text" className="rpt-input" placeholder="email@company.com, cfo@company.com"
              value={form.emailTo} onChange={e => setForm(f => ({ ...f, emailTo: e.target.value }))} id="sched-email" />
          </div>

          {createError && (
            <div style={{ fontSize: 13, color: 'var(--accent-error)', marginBottom: 8 }}>{createError}</div>
          )}

          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleCreate} disabled={creating} id="create-schedule-submit">
            {creating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Bell size={14} /> Activate Schedule</>}
          </button>
        </div>
      )}

      {/* Schedule list */}
      {loading ? (
        [1,2].map(i => <div key={i} className="glass-card" style={{ padding: 16, marginBottom: 12, height: 80, background: '#F8FAFC' }} />)
      ) : schedules.length === 0 && !showForm ? (
        <div className="glass-card rpt-empty">
          <Calendar size={36} style={{ color: 'var(--text-disabled)', marginBottom: 12 }} />
          <p>No schedules yet.</p>
          <span>Create a schedule to auto-generate and email reports daily, weekly, or monthly.</span>
        </div>
      ) : (
        schedules.map(sched => (
          <div key={sched.id} className={`glass-card rpt-schedule-row ${!sched.isActive ? 'rpt-schedule-row--inactive' : ''}`}>
            <div className="rpt-schedule-row__left">
              <div className="rpt-schedule-title">
                {REPORT_TYPES.find(t => t.id === sched.type)?.label ?? sched.type}
              </div>
              <div className="rpt-schedule-meta">
                <span className={`badge ${sched.isActive ? 'badge-success' : 'badge-info'}`}>
                  {sched.isActive ? 'Active' : 'Paused'}
                </span>
                <span>{fmtFreq(sched)}</span>
                <span>Formats: {sched.formats.join(', ')}</span>
                {sched.nextRunAt && <span>Next run: {fmtDateTime(sched.nextRunAt)}</span>}
                {sched.lastRunAt && <span>Last run: {fmtDateTime(sched.lastRunAt)}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>
                <Bell size={11} style={{ marginRight: 4 }} />
                {sched.emailTo?.join(', ')}
              </div>
            </div>
            <div className="rpt-schedule-row__actions">
              <button
                className="rpt-toggle-btn"
                onClick={() => handleToggle(sched)}
                disabled={toggling[sched.id]}
                title={sched.isActive ? 'Pause schedule' : 'Activate schedule'}
              >
                {toggling[sched.id]
                  ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  : sched.isActive
                    ? <ToggleRight size={22} style={{ color: '#10B981' }} />
                    : <ToggleLeft size={22} style={{ color: 'var(--text-disabled)' }} />
                }
              </button>
              <button
                className="rpt-del-btn"
                onClick={() => handleDelete(sched.id)}
                disabled={deleting[sched.id]}
                title="Delete schedule"
              >
                {deleting[sched.id] ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function Reports() {
  const [activeTab, setActiveTab] = useState('generate')

  return (
    <div className="reports-page">
      <div className="reports-page__header">
        <div>
          <h1 className="reports-page__title">Reports</h1>
          <p className="reports-page__sub">Generate, download, and schedule your business performance reports.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="reports-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`reports-tab ${activeTab === t.id ? 'reports-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            id={`report-tab-${t.id}`}
          >
            <t.icon size={15} strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="reports-content">
        {activeTab === 'generate'  && <GenerateTab  onGenerated={() => setActiveTab('history')} />}
        {activeTab === 'history'   && <HistoryTab />}
        {activeTab === 'schedules' && <SchedulesTab />}
      </div>
    </div>
  )
}
