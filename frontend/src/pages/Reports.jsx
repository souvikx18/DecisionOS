import { useState, useRef } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { mockSalesTrend, mockExpenseTrend, mockTopCustomers } from '../data/mockData'
import { FileText, Download, Calendar, TrendingUp, DollarSign, Users } from 'lucide-react'
import { notify } from '../components/ui/CustomToast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './Reports.css'

const REPORT_TYPES = [
  { id: 'daily',   label: 'Daily Summary',   icon: Calendar  },
  { id: 'weekly',  label: 'Weekly Report',    icon: TrendingUp },
  { id: 'monthly', label: 'Monthly Report',   icon: FileText  },
]

const AXIS_STYLE = { fill: '#475569', fontSize: 11 }
const fmtL = v => `₹${(v/100000).toFixed(1)}L`

export default function Reports() {
  const [activeReport, setActiveReport] = useState('monthly')
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef(null)

  const handleExportPDF = async () => {
    if (!reportRef.current) return
    setExporting(true)
    notify.loading('Compiling chart vectors and table data…', 'Generating PDF', { id: 'pdf' })
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`DecisionOS_${activeReport}_report_${new Date().toISOString().slice(0,10)}.pdf`)
      notify.success('High-resolution PDF report saved to downloads.', 'PDF Report Exported', { id: 'pdf' })
    } catch {
      notify.error('Could not generate PDF vector canvas. Please try again.', 'Export Failed', { id: 'pdf' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="reports-page">
      <div className="reports-page__header">
        <div>
          <h1 className="reports-page__title">Reports</h1>
          <p className="reports-page__sub">View and export your business performance reports.</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleExportPDF}
          disabled={exporting}
          id="export-pdf-btn"
        >
          <Download size={14} />
          {exporting ? 'Exporting…' : 'Export PDF'}
        </button>
      </div>

      {/* Report type tabs */}
      <div className="reports-tabs">
        {REPORT_TYPES.map(r => (
          <button
            key={r.id}
            className={`reports-tab ${activeReport === r.id ? 'reports-tab--active' : ''}`}
            onClick={() => setActiveReport(r.id)}
            id={`report-tab-${r.id}`}
          >
            <r.icon size={15} strokeWidth={1.75} />
            {r.label}
          </button>
        ))}
      </div>

      {/* Report content (captured for PDF) */}
      <div ref={reportRef} className="reports-content">
        {/* Report header */}
        <div className="reports-report-header glass-card">
          <div>
            <h2 className="reports-report-title">
              {REPORT_TYPES.find(r => r.id === activeReport)?.label}
            </h2>
            <p className="reports-report-period">
              {activeReport === 'daily' ? 'Today – 2 Aug 2026' : activeReport === 'weekly' ? '27 Jul – 2 Aug 2026' : 'July 2026'}
            </p>
          </div>
          <div className="reports-report-meta">
            <span>Generated: {new Date().toLocaleDateString('en-IN')}</span>
            <span>Company: Acme Corp</span>
          </div>
        </div>

        {/* KPI summary */}
        <div className="reports-kpi-row">
          {[
            { icon: DollarSign, label: 'Revenue',  value: '₹48.3L', change: '+12.4%', up: true  },
            { icon: TrendingUp, label: 'Sales',    value: '1,284',  change: '+8.1%',  up: true  },
            { icon: DollarSign, label: 'Expenses', value: '₹12.7L', change: '-3.2%',  up: false },
            { icon: Users,      label: 'Customers',value: '142',    change: '+4',     up: true  },
          ].map(k => (
            <div key={k.label} className="reports-kpi glass-card">
              <k.icon size={18} strokeWidth={1.75} style={{ color: 'var(--accent-primary)' }} />
              <div className="reports-kpi__val">{k.value}</div>
              <div className="reports-kpi__label">{k.label}</div>
              <div className={`reports-kpi__change ${k.up ? 'up' : 'down'}`}>{k.change}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="reports-charts-row">
          <div className="glass-card reports-chart">
            <h3>Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockSalesTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EA" opacity={0.5} />
                <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtL} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={v => [fmtL(v)]} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1D4ED8" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="target" name="Target" stroke="#DDE3EA" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card reports-chart">
            <h3>Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockExpenseTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EA" opacity={0.5} />
                <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={44} />
                <Tooltip />
                <Bar dataKey="logistics" name="Logistics" fill="#1D4ED8" radius={[3,3,0,0]} stackId="a" />
                <Bar dataKey="salaries"  name="Salaries"  fill="#6366F1" radius={[3,3,0,0]} stackId="a" />
                <Bar dataKey="marketing" name="Marketing" fill="#10B981" radius={[3,3,0,0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top customers table */}
        <div className="glass-card reports-table">
          <h3>Top Customers</h3>
          <table className="reports-customers-tbl">
            <thead>
              <tr>
                <th>#</th><th>Customer</th><th>Orders</th><th>Revenue</th><th>Change</th>
              </tr>
            </thead>
            <tbody>
              {mockTopCustomers.map(c => (
                <tr key={c.rank}>
                  <td>{c.rank}</td>
                  <td>{c.name}</td>
                  <td>{c.orders}</td>
                  <td>₹{(c.revenue/100000).toFixed(2)}L</td>
                  <td className={c.change >= 0 ? 'up' : 'down'}>{c.change >= 0 ? '+' : ''}{c.change}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
