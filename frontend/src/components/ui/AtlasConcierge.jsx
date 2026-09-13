// src/components/ui/AtlasConcierge.jsx
// ============================================================
// Atlas // Executive Assistant & Operations Concierge
// Custom Emerald-Accented Obsidian Open Chat Modal
// ============================================================

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  X, Send, RotateCcw, ArrowRight, ExternalLink,
  MoreHorizontal, Paperclip, Info, UploadCloud, LayoutDashboard,
  FileText, Sparkles, Package, Users, CreditCard, Settings,
  TrendingUp, Receipt
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import api from '../../lib/api.js'
import './AtlasConcierge.css'

// ── Iconic Atlas Robot Vector ────────────────────────────────
function AtlasRobotIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Antenna Ball */}
      <circle cx="16" cy="4.5" r="2" fill="#FFFFFF" />
      {/* Antenna Stalk */}
      <line x1="16" y1="6.5" x2="16" y2="9.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
      
      {/* Left Ear */}
      <rect x="2" y="14" width="2.5" height="7" rx="1.25" fill="#FFFFFF" />
      {/* Right Ear */}
      <rect x="27.5" y="14" width="2.5" height="7" rx="1.25" fill="#FFFFFF" />

      {/* Head Outer Frame */}
      <rect
        x="4.5"
        y="9.5"
        width="23"
        height="16.5"
        rx="8"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        fill="none"
      />

      {/* Mint Green Glowing Eyes */}
      <circle cx="11.5" cy="18" r="2.2" fill="#00E599" />
      <circle cx="20.5" cy="18" r="2.2" fill="#00E599" />
    </svg>
  )
}

// ── Multi-Domain Intelligent Knowledge Engine ─────────────────

const KNOWLEDGE_BASE = [
  // 1. Company Logo & Branding (Exact match to user's design reference)
  {
    triggers: [
      'logo', 'branding', 'company logo', 'upload logo', 'organization logo',
      'change logo', 'add logo', 'brand', 'avatar', 'profile picture'
    ],
    title: 'How to Upload Your Organization Logo',
    intro: "You can upload your company's official logo directly in your profile settings:",
    steps: [
      {
        num: 1,
        title: 'Open Profile Settings',
        desc: 'Click on your profile name at the top right, or go to **Settings > Profile**.',
      },
      {
        num: 2,
        title: 'Upload Logo',
        desc: 'Under the Organization Logo section, click **Upload Logo**.',
      },
      {
        num: 3,
        title: 'Choose an Image',
        desc: 'Select an image (**PNG, JPG, WebP, or SVG** up to 4MB).',
      },
      {
        num: 4,
        title: 'Save Changes',
        desc: 'Click **Save Changes**.',
      },
    ],
    note: 'Once saved, your custom logo will immediately appear in the left navigation sidebar and on the header of all generated executive reports.',
    actions: [
      { label: 'Go to Profile & Logo', path: '/settings', icon: ExternalLink },
    ],
  },

  // 2. Data Import & Spreadsheets
  {
    triggers: [
      'import', 'upload', 'csv', 'excel', 'xlsx', 'spreadsheet',
      'file upload', 'how to import', 'import data', 'sample template', 'upload data'
    ],
    title: 'How to Ingest Business Spreadsheets',
    intro: 'You can upload historical sales, expenses, and inventory data into DecisionOS:',
    steps: [
      {
        num: 1,
        title: 'Open Data Import',
        desc: 'Click **Data Import** on the sidebar or navigate to the ingestion console.',
      },
      {
        num: 2,
        title: 'Select Dataset Type',
        desc: 'Choose between Sales Orders, Expenses, Inventory, or Customers.',
      },
      {
        num: 3,
        title: 'Choose Spreadsheet File',
        desc: 'Upload your **CSV, Excel (.xlsx), or JSON** spreadsheet (up to 50MB).',
      },
      {
        num: 4,
        title: 'Confirm Column Mapping',
        desc: 'Verify the column mappings and click **Run Ingestion**.',
      },
    ],
    note: 'Pre-formatted sample templates can be downloaded directly from the Data Import page to ensure 100% schema compatibility.',
    actions: [
      { label: 'Open Data Import Hub', path: '/import', icon: ExternalLink },
      { label: 'View Sales Ledger', path: '/sales', icon: TrendingUp },
    ],
  },

  // 3. Reports Studio & PDF Generation
  {
    triggers: [
      'report', 'reports', 'pdf', 'export', 'download report', 'cron',
      'schedule', 'email report', 'financial report', 'p&l', 'statement'
    ],
    title: 'Executive Reports & Automated Scheduling',
    intro: 'Generate comprehensive business reports on-demand or configure automated email crons:',
    steps: [
      {
        num: 1,
        title: 'Open Reports Studio',
        desc: 'Click **Reports** on the left navigation bar.',
      },
      {
        num: 2,
        title: 'Choose Report Type',
        desc: 'Select Executive Summary, Financial P&L, Sales Velocity, or Inventory Audits.',
      },
      {
        num: 3,
        title: 'Choose Format',
        desc: 'Export as high-resolution **PDF**, multi-sheet **Excel (XLSX)**, or **CSV**.',
      },
      {
        num: 4,
        title: 'Automate Dispatch',
        desc: 'Set up recurring weekly or monthly crons to automatically email founders and stakeholders.',
      },
    ],
    note: 'All generated PDF reports automatically render with your organization logo and designated currency.',
    actions: [
      { label: 'Configure Reports Studio', path: '/reports', icon: ExternalLink },
    ],
  },

  // 4. Subscription Plans & Billing
  {
    triggers: [
      'plan', 'plans', 'pricing', 'price', 'billing', 'subscription',
      'upgrade', 'starter', 'growth', 'enterprise', 'razorpay', 'cost',
      'payment', 'invoice', 'receipt', 'tokens', 'quota'
    ],
    title: 'Subscription Tiers & Quota Management',
    intro: 'Select an operating plan suited for your team size and analytics requirements:',
    steps: [
      {
        num: 1,
        title: 'Starter (Free)',
        desc: '1 Workspace, 10,000 AI tokens/month, 10 automated report exports.',
      },
      {
        num: 2,
        title: 'Growth Pro (₹2,999/mo)',
        desc: '250,000 AI tokens/month, unlimited automated reports, RFM churn scoring.',
      },
      {
        num: 3,
        title: 'Enterprise (Custom)',
        desc: '1,000,000+ AI tokens/month, dedicated processing queue, 99.9% uptime SLA.',
      },
    ],
    note: 'Payments are processed securely through Razorpay supporting UPI, NetBanking, RuPay, and Cards.',
    actions: [
      { label: 'Manage Billing & Plans', path: '/billing', icon: ExternalLink },
    ],
  },

  // 5. Team Members & Roles
  {
    triggers: [
      'team', 'member', 'members', 'invite', 'role', 'roles', 'permission',
      'permissions', 'admin', 'analyst', 'viewer', 'user management', 'access'
    ],
    title: 'Team Hierarchy & Access Permissions',
    intro: 'Manage roles and invite team members under Settings > Team Members:',
    steps: [
      {
        num: 1,
        title: 'Owner / Admin',
        desc: 'Full administrative authority over billing, team roster, data ingestion, and settings.',
      },
      {
        num: 2,
        title: 'Analyst',
        desc: 'Can upload spreadsheets, generate reports, and review predictive AI insights.',
      },
      {
        num: 3,
        title: 'Viewer',
        desc: 'Read-only access to inspect the executive dashboard and financial velocity charts.',
      },
    ],
    note: 'Send instant email invitations from the Team Members tab to grant colleagues workspace access.',
    actions: [
      { label: 'Manage Team Members', path: '/settings', icon: ExternalLink },
    ],
  },

  // 6. Greetings & Introductions
  {
    triggers: [
      'hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon',
      'greetings', 'sup', 'yo', 'hola', 'namaste', 'start'
    ],
    title: 'Welcome to DecisionOS',
    intro: "Hello! I'm **Atlas**, your executive operations assistant. Here are key workflows to explore:",
    steps: [
      {
        num: 1,
        title: 'Brand Identity',
        desc: 'Upload your company logo in **Settings > Profile** to personalize your suite.',
      },
      {
        num: 2,
        title: 'Data Ingestion',
        desc: 'Import your sales, expenses, and inventory spreadsheets in **Data Import**.',
      },
      {
        num: 3,
        title: 'Live Metrics',
        desc: 'Track revenue run rates, stockout alerts, and churn signals in **Dashboard**.',
      },
    ],
    note: 'You can ask me questions anytime about metrics, reports, or platform features.',
    actions: [
      { label: 'Executive Dashboard', path: '/dashboard', icon: ExternalLink },
      { label: 'Data Import Hub', path: '/import', icon: ExternalLink },
    ],
  },

  // 7. Inventory & Stock Alerts
  {
    triggers: [
      'inventory', 'stock', 'low stock', 'sku', 'reorder', 'warehouse',
      'stockout', 'depletion', 'items', 'products'
    ],
    title: 'Inventory Monitoring & Stockout Alerts',
    intro: 'Keep your supply chain optimized with real-time stock telemetry:',
    steps: [
      {
        num: 1,
        title: 'Threshold Triggers',
        desc: 'Warnings fire automatically when quantity falls at or below designated Reorder Levels.',
      },
      {
        num: 2,
        title: 'Depletion Run-Rate',
        desc: 'Calculates remaining operational days based on rolling 30-day consumption velocity.',
      },
      {
        num: 3,
        title: 'Warehouse Valuation',
        desc: 'Tracks unit cost margins and total active warehouse asset values.',
      },
    ],
    note: 'Import updated inventory spreadsheets periodically to ensure restock alerts remain accurate.',
    actions: [
      { label: 'Open Inventory Ledger', path: '/inventory', icon: ExternalLink },
      { label: 'Import Stock Data', path: '/import', icon: ExternalLink },
    ],
  },

  // 8. Customer Intelligence & Churn
  {
    triggers: [
      'customer', 'customers', 'client', 'clients', 'churn', 'rfm',
      'retention', 'clv', 'lifetime value', 'buyer', 'buyers'
    ],
    title: 'Customer Intelligence & Churn Scoring',
    intro: 'Segment buyers using our automated RFM (Recency, Frequency, Monetary) matrix:',
    steps: [
      {
        num: 1,
        title: 'Champions',
        desc: 'Frequent purchasers representing your highest lifetime revenue contributors.',
      },
      {
        num: 2,
        title: 'Loyal Regulars',
        desc: 'Consistent buyers maintaining predictable monthly order velocity.',
      },
      {
        num: 3,
        title: 'At-Risk Accounts',
        desc: 'High-value accounts whose purchase interval has exceeded standard benchmarks.',
      },
    ],
    note: 'Identify at-risk accounts early to re-engage them before revenue churn occurs.',
    actions: [
      { label: 'Open Customers Console', path: '/customers', icon: ExternalLink },
    ],
  },
]

export default function AtlasConcierge() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Current Route Context
  const pageName = useMemo(() => {
    const p = location.pathname.replace('/', '')
    if (!p || p === 'dashboard') return 'Dashboard'
    return p.charAt(0).toUpperCase() + p.slice(1)
  }, [location.pathname])

  // Context-aware dynamic suggestions
  const contextualSuggestions = useMemo(() => {
    const p = location.pathname
    if (p.includes('import')) {
      return [
        { text: 'Supported Formats', query: 'What formats can I upload in Data Import?' },
        { text: 'Required Columns', query: 'What columns are required for Sales and Inventory?' },
        { text: 'Executive Dashboard', query: 'Show me the Dashboard' },
      ]
    }
    if (p.includes('billing')) {
      return [
        { text: 'Plan Details', query: 'What is included in Growth Pro vs Starter?' },
        { text: 'Payment Methods', query: 'What payment options are supported?' },
        { text: 'Invoices & Quotas', query: 'Where can I download billing invoices?' },
      ]
    }
    if (p.includes('settings')) {
      return [
        { text: 'Upload Company Logo', query: 'How do I upload our organization logo?' },
        { text: 'Invite Team Roles', query: 'How do Admin and Analyst roles differ?' },
        { text: 'Timezone & Currency', query: 'How do I set organization currency?' },
      ]
    }
    return [
      { text: 'Upload Company Logo', query: 'How do I upload our organization logo?' },
      { text: 'How to Import Data', query: 'How do I upload our CSV records?' },
      { text: 'Executive Reports', query: 'How to generate reports?' },
      { text: 'Subscription Plans', query: 'What are the subscription plans?' },
    ]
  }, [location.pathname])

  // Initially empty so only suggested questions appear when anyone first opens the chat
  const [messages, setMessages] = useState([])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages])

  // Query processing
  const processQuery = async (queryText) => {
    const raw = queryText.trim()
    const q = raw.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()

    // ── 0. Conversational intent pre-filter (runs before knowledge base) ──
    const hasAny = (...words) => words.some((w) => q.includes(w))
    const isExact = (...words) => words.some((w) => q === w)
    const startsWith = (...words) => words.some((w) => q.startsWith(w + ' ') || q === w)

    // Greeting detection — catches typos like 'hlw', 'hii', 'heyy', etc.
    const greetWords = [
      'hi', 'hii', 'hiii', 'hlw', 'hlo', 'hllo', 'hello', 'hey', 'heyy', 'heya',
      'howdy', 'hola', 'sup', 'yo', 'namaste', 'namaskar', 'greetings',
      'gm', 'good morning', 'good evening', 'good afternoon', 'good night',
      'whats up', 'wassup', 'watsup', 'how are you', 'how r u',
    ]
    const isGreeting = greetWords.some((g) => isExact(g) || startsWith(g))

    const isThanks = isExact('thanks', 'thank you', 'thx', 'ty', 'ok', 'okay', 'k', 'great',
      'nice', 'awesome', 'cool', 'perfect', 'got it')

    const isAboutAtlas = hasAny('who are you', 'what are you', 'what can you do',
      'what do you do', 'about you', 'introduce yourself', 'your name', 'atlas')

    if (isGreeting) {
      const hour = new Date().getHours()
      const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
      return {
        title: `${timeGreet}! 👋`,
        intro: "I'm **Atlas**, your DecisionOS executive assistant. Here's what I can help with:",
        steps: [
          { num: 1, title: 'Live Business Metrics', desc: 'Ask about revenue, expenses, inventory, or customers — I have real-time data.' },
          { num: 2, title: 'Platform Guidance', desc: 'Get step-by-step walkthroughs for importing data, generating reports, or setting up teams.' },
          { num: 3, title: 'AI Insights', desc: 'I can surface trends, anomalies, and forecasts from your business data.' },
        ],
        note: 'Try asking: "What is our revenue this month?" or "Show inventory alerts".',
        reply: null,
        actions: [
          { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Import Data', path: '/import', icon: ExternalLink },
        ],
        keyMetrics: null,
      }
    }

    if (isThanks) {
      return {
        title: "You're welcome! 😊",
        intro: null,
        steps: null,
        note: null,
        reply: "Happy to help! Feel free to ask me anything else about your business performance or how to use DecisionOS.",
        actions: [
          { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard },
        ],
        keyMetrics: null,
      }
    }

    if (isAboutAtlas) {
      return {
        title: "Meet Atlas 🤖",
        intro: "I'm **Atlas**, the AI-powered executive operations assistant built into **DecisionOS**. Here's what I can do:",
        steps: [
          { num: 1, title: '📊 Business Analytics', desc: 'Revenue trends, expense breakdowns, profit margins, sales velocity.' },
          { num: 2, title: '📦 Inventory Intelligence', desc: 'Stock level alerts, reorder forecasts, warehouse valuation.' },
          { num: 3, title: '👥 Customer Insights', desc: 'Churn risk scoring, top accounts, CLV analysis.' },
          { num: 4, title: '📄 Reports & Exports', desc: 'Generate PDF/XLSX/CSV reports and schedule automated email dispatches.' },
        ],
        note: 'I use your live business data from DecisionOS to give you accurate, real-time answers.',
        reply: null,
        actions: [
          { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard },
        ],
        keyMetrics: null,
      }
    }

    // ── 1. Direct match on local platform knowledge base ───────────
    for (const item of KNOWLEDGE_BASE) {
      const match = item.triggers.some((trigger) => {
        if (trigger.length <= 3) {
          const regex = new RegExp(`\\b${trigger}\\b`, 'i')
          return regex.test(q)
        }
        return q.includes(trigger)
      })

      if (match) {
        return {
          title: item.title,
          intro: item.intro,
          steps: item.steps,
          note: item.note,
          reply: item.reply || null,
          actions: item.actions || [],
          keyMetrics: null,
        }
      }
    }

    // ── 2. Query Real Backend AI Engine ───────────────────────────
    try {
      setIsAnalyzing(true)
      const res = await api.post('/ai/ask', { query: raw })
      const data = res.data?.data || res.data

      if (data && (data.answer || data.text)) {
        return {
          title: 'Business Intelligence Analysis',
          intro: null,
          steps: null,
          note: null,
          reply: data.answer || data.text,
          actions: [
            { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { label: 'Reports Studio', path: '/reports', icon: FileText },
          ],
          keyMetrics: data.keyMetrics || null,
        }
      }
    } catch (err) {
      // Graceful fallback
    } finally {
      setIsAnalyzing(false)
    }

    // ── 3. Conversational Fallback ─────────────────────────────────
    return {
      title: 'DecisionOS Navigation Guide',
      intro: 'Here are the primary operational centers available in your workspace:',
      steps: [
        {
          num: 1,
          title: 'Data Import Hub',
          desc: 'Upload and validate sales, expense, inventory, and customer spreadsheets.',
        },
        {
          num: 2,
          title: 'Executive Dashboard',
          desc: 'Monitor real-time revenue velocity, gross margins, and daily run rates.',
        },
        {
          num: 3,
          title: 'Reports Studio',
          desc: 'Export executive PDFs or set up automated weekly and monthly crons.',
        },
        {
          num: 4,
          title: 'Settings & Profile',
          desc: 'Upload your organization logo and manage team member permissions.',
        },
      ],
      note: 'Select an executive action below or refine your inquiry.',
      reply: null,
      actions: [
        { label: 'Go to Profile & Logo', path: '/settings', icon: ExternalLink },
        { label: 'Open Data Import Hub', path: '/import', icon: ExternalLink },
      ],
      keyMetrics: null,
    }
  }

  const handleSend = async (textToSend) => {
    const q = (textToSend || input).trim()
    if (!q) return

    const userMsg = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsAnalyzing(true)

    // Natural 1-second thinking pause before replying
    await new Promise((r) => setTimeout(r, 1000))

    const result = await processQuery(q)
    setIsAnalyzing(false)

    const botMsg = {
      id: 'bot_' + Date.now(),
      sender: 'bot',
      title: result.title,
      intro: result.intro,
      steps: result.steps,
      note: result.note,
      text: result.reply,
      actions: result.actions || [],
      keyMetrics: result.keyMetrics,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, botMsg])
  }

  const handleReset = () => {
    setMessages([])
  }

  // Helper to format inline bolding & code
  const renderFormattedInline = (text) => {
    if (!text) return null
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="atlas-inline-code">{part.slice(1, -1)}</code>
      }
      return part
    })
    return parts
  }

  // Format markdown body text
  const renderFormattedText = (text) => {
    if (!text) return null
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      const parts = renderFormattedInline(line)

      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={idx} className="atlas-bullet-item">
            <span className="atlas-bullet-dot">•</span>
            <div className="atlas-bullet-content">{parts}</div>
          </div>
        )
      }

      return (
        <p key={idx} className="atlas-paragraph">
          {parts}
        </p>
      )
    })
  }

  return (
    <div className="atlas-widget">
      {/* ── Chat Modal Panel (Exact Match to User Reference Design) ── */}
      {isOpen && (
        <div className="atlas-panel">
          {/* Header */}
          <div className="atlas-header">
            <div className="atlas-header__left">
              <div className="atlas-header__avatar">
                <AtlasRobotIcon size={24} />
              </div>
              <div className="atlas-header__info">
                <span className="atlas-header__name">Atlas</span>
                <span className="atlas-header__role">Assistant</span>
              </div>
            </div>

            <div className="atlas-header__actions">
              <div className="atlas-header__status">
                <span className="atlas-header__dot" />
                <span>Online</span>
              </div>
              <button
                className="atlas-header__btn"
                title="Restart conversation"
                onClick={handleReset}
              >
                <RotateCcw size={15} />
              </button>
              <button
                className="atlas-header__btn atlas-header__btn--close"
                title="Close Atlas"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="atlas-messages">
            {/* Suggested Question Chips (Stacked vertically 1 under another) */}
            {messages.length === 0 && (
              <div className="atlas-topics-wrap">
                <span className="atlas-topics-label">Suggested Questions</span>
                <div className="atlas-topics-list">
                  {contextualSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      className="atlas-topic-chip"
                      onClick={() => handleSend(s.query)}
                    >
                      <span>{s.text}</span>
                      <ArrowRight size={13} className="atlas-topic-chip__arrow" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message List */}
            {messages.map((m) => (
              <div key={m.id} className={`atlas-message-row atlas-message-row--${m.sender}`}>
                {/* Bot Avatar on the Left */}
                {m.sender === 'bot' && (
                  <div className="atlas-msg-avatar">
                    <AtlasRobotIcon size={18} />
                  </div>
                )}

                <div className="atlas-msg-wrapper">
                  <div className={`atlas-bubble atlas-bubble--${m.sender}`}>
                    {/* Structured Title & Intro */}
                    {m.title && <h3 className="atlas-bubble__title">{m.title}</h3>}
                    {m.intro && <p className="atlas-bubble__intro">{renderFormattedInline(m.intro)}</p>}

                    {/* Stepper Timeline */}
                    {m.steps && m.steps.length > 0 && (
                      <div className="atlas-stepper">
                        {m.steps.map((step, sIdx) => {
                          const isFirst = sIdx === 0
                          const isLast = sIdx === m.steps.length - 1
                          return (
                            <div key={sIdx} className="atlas-step-item">
                              {!isLast && <div className="atlas-step-line" />}
                              <div className={`atlas-step-badge ${isFirst ? 'atlas-step-badge--active' : ''}`}>
                                {step.num}
                              </div>
                              <div className="atlas-step-content">
                                <div className="atlas-step-title">{step.title}</div>
                                <div className="atlas-step-desc">{renderFormattedInline(step.desc)}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Unstructured Text */}
                    {m.text && !m.steps && (
                      <div className="atlas-bubble__body">
                        {renderFormattedText(m.text)}
                      </div>
                    )}

                    {/* Key Metrics Cards if applicable */}
                    {m.keyMetrics && Object.keys(m.keyMetrics).length > 0 && (
                      <div className="atlas-metrics-grid">
                        {Object.entries(m.keyMetrics).map(([k, v]) => (
                          <div key={k} className="atlas-metric-card">
                            <span className="atlas-metric-label">{k}</span>
                            <span className="atlas-metric-val">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Info Callout Box */}
                    {m.note && (
                      <div className="atlas-callout-box">
                        <Info size={16} className="atlas-callout-icon" />
                        <div className="atlas-callout-text">{renderFormattedInline(m.note)}</div>
                      </div>
                    )}

                    {/* Action Navigation Buttons */}
                    {m.actions && m.actions.length > 0 && (
                      <div className="atlas-action-nav-pills">
                        {m.actions.map((act, aIdx) => {
                          const Icon = act.icon || ExternalLink
                          return (
                            <button
                              key={aIdx}
                              className="atlas-action-btn"
                              onClick={() => navigate(act.path)}
                            >
                              <div className="atlas-action-btn__left">
                                <Icon size={15} />
                                <span>{act.label}</span>
                              </div>
                              <ArrowRight size={14} className="atlas-action-btn__arrow" />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <span className="atlas-time">{m.time}</span>
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isAnalyzing && (
              <div className="atlas-typing-row">
                <div className="atlas-typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>Atlas is analyzing telemetry & models…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="atlas-footer">
            <form
              className="atlas-form"
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
            >
              <button
                type="button"
                className="atlas-attach-btn"
                title="Attach file"
              >
                <Paperclip size={17} />
              </button>

              <input
                ref={inputRef}
                type="text"
                className="atlas-input"
                placeholder="Ask anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isAnalyzing}
              />

              <button
                type="submit"
                className="atlas-send-btn"
                disabled={!input.trim() || isAnalyzing}
                title="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Floating Launcher Button (Compact Reference Style) ── */}
      <button
        className="atlas-launcher"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? 'Minimize Atlas' : 'Open Atlas Assistant'}
      >
        <div className="atlas-launcher__avatar">
          {isOpen ? <X size={15} /> : <AtlasRobotIcon size={19} />}
        </div>
        <div className="atlas-launcher__text-wrap">
          <span className="atlas-launcher__name">Atlas</span>
          <span className="atlas-launcher__role">Assistant</span>
        </div>
        <span className="atlas-launcher__status-dot" />
      </button>
    </div>
  )
}
