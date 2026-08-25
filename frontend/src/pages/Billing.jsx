// src/pages/Billing.jsx
import { useState } from 'react'
import {
  CreditCard, Check, Zap, Sparkles, ArrowRight,
  Download, ExternalLink, RefreshCw, HelpCircle,
  FileText, CheckCircle2, ChevronDown, ChevronUp, Layers, Users,
  Plus, ShieldCheck, Cpu, Receipt
} from 'lucide-react'
import { notify } from '../components/ui/CustomToast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './Billing.css'

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Core business intelligence for solo founders and early-stage teams.',
    priceMonthly: { INR: 0, USD: 0 },
    priceYearly: { INR: 0, USD: 0 },
    isPopular: false,
    ctaText: 'Current Plan',
    ctaDisabled: true,
    features: [
      '1 Organization Workspace',
      'Up to 3 Team Member Seats',
      '10,000 AI Reasoning Tokens / mo',
      '5 Automated Report Exports / mo',
      'Standard CSV & XLSX Ingestion (10MB)',
      '7-Day Cloud File Retention',
      'Community & Standard Support',
    ],
  },
  {
    id: 'pro',
    name: 'Growth Pro',
    tagline: 'Predictive intelligence, cron schedules, and advanced business scans.',
    priceMonthly: { INR: 2999, USD: 39 },
    priceYearly: { INR: 2399, USD: 29 },
    isPopular: true,
    ctaText: 'Upgrade to Growth Pro',
    ctaDisabled: false,
    features: [
      'Unlimited Workspaces',
      'Up to 15 Team Member Seats',
      '250,000 AI Tokens / mo (Gemini 3.6 Flash)',
      'Unlimited Cron PDF, XLSX & CSV Exports',
      '30-Day Cloud File Retention + Purger',
      'RFM Customer Segmentation & Churn Matrix',
      'Priority 24/7 Support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise AI',
    tagline: 'Dedicated queue workers, custom retention, and high-volume ERP integrations.',
    priceMonthly: { INR: 8999, USD: 119 },
    priceYearly: { INR: 7199, USD: 95 },
    isPopular: false,
    ctaText: 'Upgrade to Enterprise',
    ctaDisabled: false,
    features: [
      'Unlimited Workspaces & Team Seats',
      '1,000,000+ AI Tokens / mo',
      'Dedicated BullMQ Isolated Queue Worker',
      'Unlimited Custom Report Formats',
      'Custom Retention (90+ Days / Permanent)',
      'Custom ERP API & Webhook Integrations',
      '99.9% Uptime SLA & Dedicated Account Lead',
    ],
  },
]

const MOCK_INVOICES = [
  { id: 'INV-2026-0881', date: '01 Aug 2026', amount: '₹2,399.00', status: 'PAID', plan: 'Growth Pro (Monthly)' },
  { id: 'INV-2026-0742', date: '01 Jul 2026', amount: '₹2,399.00', status: 'PAID', plan: 'Growth Pro (Monthly)' },
  { id: 'INV-2026-0619', date: '01 Jun 2026', amount: '₹2,399.00', status: 'PAID', plan: 'Growth Pro (Monthly)' },
]

const FAQS = [
  {
    q: 'How does billing work when I upgrade or downgrade?',
    a: 'When you upgrade, you gain immediate access to all higher-tier features. Charges are prorated based on your billing cycle. If you downgrade, the new plan takes effect at the end of the current period.',
  },
  {
    q: 'What payment methods and currencies are supported?',
    a: 'We support all major Credit and Debit cards (Visa, Mastercard, AMEX), UPI, and net banking via Stripe. Billing is supported in both INR (₹) and USD ($).',
  },
  {
    q: 'Can I get GST / Tax-compliant invoices?',
    a: 'Yes. You can add your company GSTIN in Organization Settings, and all downloaded Stripe invoices will include your official business details and tax breakdown.',
  },
  {
    q: 'What happens if I reach my monthly quota limit?',
    a: 'You will receive an in-app and email alert before reaching your limit. You can purchase additional capacity add-ons or upgrade your plan anytime without data disruption.',
  },
]

export default function Billing() {
  const { user } = useAuth()
  const [billingCycle, setBillingCycle] = useState('yearly') // 'monthly' | 'yearly'
  const [currency, setCurrency] = useState('INR') // 'INR' | 'USD'
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  const currentPlan = 'starter'

  const handleCheckout = (planId) => {
    if (planId === currentPlan) return
    setLoadingPlan(planId)
    notify.info(`Redirecting to Stripe Checkout for ${planId.toUpperCase()}…`, 'Stripe Checkout')
    setTimeout(() => {
      setLoadingPlan(null)
      notify.success('Stripe session created. Live checkout ready.', 'Stripe Ready 💳')
    }, 1200)
  }

  const handleOpenCustomerPortal = () => {
    notify.info('Opening Stripe Customer Portal to manage cards and invoices…', 'Customer Portal')
  }

  return (
    <div className="clean-billing">
      {/* ── Header ── */}
      <div className="clean-billing__header">
        <div>
          <h1 className="clean-billing__title">Billing & Subscription</h1>
          <p className="clean-billing__subtitle">
            Manage your organization's subscription plan, resource usage, and payment methods.
          </p>
        </div>
        <button className="btn-ghost clean-billing__portal-btn" onClick={handleOpenCustomerPortal}>
          <ExternalLink size={14} /> Manage via Stripe Portal
        </button>
      </div>

      {/* ── Section 1: Current Plan & Quota Cockpit ── */}
      <div className="clean-card clean-billing__current-plan">
        <div className="clean-billing__plan-banner">
          <div className="clean-billing__plan-info">
            <div className="clean-billing__status-tag">
              <span className="clean-billing__status-dot" />
              <span>CURRENT SUBSCRIPTION</span>
            </div>
            <h2 className="clean-billing__plan-name">Starter Plan (Free Tier)</h2>
            <p className="clean-billing__plan-desc">
              Your organization is active on the Starter tier. Next monthly quota refresh on <strong>01 September 2026</strong>.
            </p>
          </div>

          <div className="clean-billing__plan-actions">
            <div className="clean-billing__price-badge">
              <span className="clean-billing__price-number">₹0</span>
              <span className="clean-billing__price-period">/ month</span>
            </div>
            <a href="#plans" className="btn-primary clean-billing__change-plan-btn">
              Upgrade Plan <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* Resource Usage Meters */}
        <div className="clean-billing__meters-grid">
          {[
            { label: 'AI Tokens (Gemini)', used: '42,500', max: '100,000', unit: 'tokens', pct: 42, color: '#8B5CF6' },
            { label: 'Automated Reports', used: '4', max: '10', unit: 'exports', pct: 40, color: '#3B82F6' },
            { label: 'Team Seats', used: '2', max: '3', unit: 'seats', pct: 66, color: '#10B981' },
            { label: 'Data Ingestion', used: '12,400', max: '50,000', unit: 'rows', pct: 25, color: '#F59E0B' },
          ].map((m) => (
            <div key={m.label} className="clean-billing__meter-box">
              <div className="clean-billing__meter-header">
                <span className="clean-billing__meter-label">{m.label}</span>
                <span className="clean-billing__meter-stats">
                  {m.used} <span className="clean-billing__meter-max">/ {m.max}</span>
                </span>
              </div>
              <div className="clean-billing__progress-track">
                <div
                  className="clean-billing__progress-fill"
                  style={{ width: `${m.pct}%`, background: m.color }}
                />
              </div>
              <div className="clean-billing__meter-foot">
                <span>{m.pct}% utilized</span>
                <span>{100 - m.pct}% remaining</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Pricing Matrix ── */}
      <div id="plans" className="clean-billing__section">
        <div className="clean-billing__section-head">
          <div>
            <h2 className="clean-billing__section-title">Subscription Plans</h2>
            <p className="clean-billing__section-sub">
              Select the plan that fits your organization's business scale.
            </p>
          </div>

          {/* Controls: Billing Interval & Currency Switcher */}
          <div className="clean-billing__controls-bar">
            {/* Interval Toggle */}
            <div className="clean-billing__toggle-group">
              <button
                className={`clean-billing__toggle-btn ${billingCycle === 'monthly' ? 'clean-billing__toggle-btn--active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={`clean-billing__toggle-btn ${billingCycle === 'yearly' ? 'clean-billing__toggle-btn--active' : ''}`}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly
                <span className="clean-billing__save-pill">20% OFF</span>
              </button>
            </div>

            {/* Currency Toggle */}
            <div className="clean-billing__toggle-group">
              <button
                className={`clean-billing__toggle-btn ${currency === 'INR' ? 'clean-billing__toggle-btn--active' : ''}`}
                onClick={() => setCurrency('INR')}
              >
                INR (₹)
              </button>
              <button
                className={`clean-billing__toggle-btn ${currency === 'USD' ? 'clean-billing__toggle-btn--active' : ''}`}
                onClick={() => setCurrency('USD')}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="clean-billing__plans-grid">
          {PLANS.map((p) => {
            const price = billingCycle === 'yearly' ? p.priceYearly[currency] : p.priceMonthly[currency]
            const isCurrent = p.id === currentPlan
            const symbol = CURRENCY_SYMBOLS[currency]

            return (
              <div
                key={p.id}
                className={`clean-card clean-billing__plan-card ${p.isPopular ? 'clean-billing__plan-card--popular' : ''}`}
              >
                {p.isPopular && (
                  <div className="clean-billing__popular-pill">
                    <Sparkles size={11} /> MOST POPULAR
                  </div>
                )}

                <div className="clean-billing__card-header">
                  <h3 className="clean-billing__card-name">{p.name}</h3>
                  <p className="clean-billing__card-tagline">{p.tagline}</p>
                </div>

                <div className="clean-billing__card-pricing">
                  <div className="clean-billing__price-row">
                    <span className="clean-billing__currency-sign">{symbol}</span>
                    <span className="clean-billing__price-digits">
                      {price.toLocaleString('en-IN')}
                    </span>
                    <span className="clean-billing__price-interval">/ month</span>
                  </div>
                  {billingCycle === 'yearly' && price > 0 ? (
                    <div className="clean-billing__yearly-billed">
                      Billed annually at {symbol}{(price * 12).toLocaleString('en-IN')} / year
                    </div>
                  ) : (
                    <div className="clean-billing__yearly-billed" style={{ color: 'var(--text-disabled)' }}>
                      {price === 0 ? 'Free forever' : 'Billed monthly'}
                    </div>
                  )}
                </div>

                <button
                  className={`clean-billing__cta-button ${p.isPopular ? 'btn-primary' : 'btn-ghost'}`}
                  disabled={isCurrent || loadingPlan === p.id}
                  onClick={() => handleCheckout(p.id)}
                >
                  {loadingPlan === p.id ? (
                    <RefreshCw size={14} className="clean-billing__spin" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    <>
                      {p.ctaText} <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <div className="clean-billing__features-wrap">
                  <span className="clean-billing__features-heading">Plan Includes:</span>
                  <ul className="clean-billing__features-list">
                    {p.features.map((feat, i) => (
                      <li key={i} className="clean-billing__feature-item">
                        <Check size={14} className="clean-billing__feature-check" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 3: Payment Method & Invoices (2 Column Grid) ── */}
      <div className="clean-billing__bottom-grid">
        {/* Payment Method */}
        <div className="clean-card clean-billing__card-box">
          <div className="clean-billing__box-header">
            <CreditCard size={18} className="clean-billing__box-icon" />
            <div>
              <h3 className="clean-billing__box-title">Payment Method</h3>
              <p className="clean-billing__box-sub">Active billing card secured via Stripe.</p>
            </div>
          </div>

          <div className="clean-billing__payment-card">
            <div className="clean-billing__payment-top">
              <div className="clean-billing__card-badge">VISA</div>
              <span className="badge badge-success">Primary Card</span>
            </div>
            <div className="clean-billing__card-digits">•••• •••• •••• 4242</div>
            <div className="clean-billing__card-details">
              <span>Cardholder: <strong>{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Account Owner'}</strong></span>
              <span>Expires: <strong>12 / 2028</strong></span>
            </div>
          </div>

          <div className="clean-billing__meta-summary">
            <div className="clean-billing__meta-row">
              <span>Billing Currency</span>
              <strong>{currency} ({CURRENCY_SYMBOLS[currency]})</strong>
            </div>
            <div className="clean-billing__meta-row">
              <span>Registered GSTIN</span>
              <strong>27AAPCU9603R1ZM</strong>
            </div>
          </div>

          <button className="btn-ghost clean-billing__update-card-btn" onClick={handleOpenCustomerPortal}>
            <ExternalLink size={13} /> Update Payment Method on Stripe
          </button>
        </div>

        {/* Invoices & Receipts */}
        <div className="clean-card clean-billing__card-box">
          <div className="clean-billing__box-header">
            <Receipt size={18} className="clean-billing__box-icon" />
            <div>
              <h3 className="clean-billing__box-title">Invoice & Receipts Ledger</h3>
              <p className="clean-billing__box-sub">Download official PDF invoices and tax receipts.</p>
            </div>
          </div>

          <div className="clean-billing__invoices-list">
            {MOCK_INVOICES.map((inv) => (
              <div key={inv.id} className="clean-billing__invoice-row">
                <div className="clean-billing__invoice-info">
                  <div className="clean-billing__invoice-id">{inv.id}</div>
                  <div className="clean-billing__invoice-meta">{inv.date} · {inv.plan}</div>
                </div>

                <div className="clean-billing__invoice-action">
                  <span className="clean-billing__invoice-price">{inv.amount}</span>
                  <span className="badge badge-success">{inv.status}</span>
                  <button
                    className="clean-billing__download-icon-btn"
                    title="Download Receipt"
                    onClick={() => notify.success(`Receipt for ${inv.id} downloaded.`, 'PDF Ready ✓')}
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="clean-billing__invoice-note">
            Invoices are generated automatically by Stripe at the start of each billing cycle.
          </div>
        </div>
      </div>

      {/* ── Section 4: FAQs ── */}
      <div className="clean-card clean-billing__faqs-box">
        <div className="clean-billing__box-header">
          <HelpCircle size={18} className="clean-billing__box-icon" />
          <div>
            <h3 className="clean-billing__box-title">Frequently Asked Questions</h3>
            <p className="clean-billing__box-sub">Everything you need to know about plans, billing, and taxes.</p>
          </div>
        </div>

        <div className="clean-billing__faqs-list">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="clean-billing__faq-item">
              <button
                className="clean-billing__faq-trigger"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {openFaq === idx && (
                <div className="clean-billing__faq-body">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
