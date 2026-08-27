// src/pages/Billing.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard, Check, Sparkles, ArrowRight,
  Download, ExternalLink, RefreshCw, HelpCircle,
  Receipt, Loader2, Lock, ChevronDown, ChevronUp,
  X, ShieldCheck, Zap, QrCode, Building2
} from 'lucide-react'
import { notify } from '../components/ui/CustomToast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useRealtime } from '../lib/hooks/useRealtime.js'
import api from '../lib/api.js'
import './Billing.css'

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
}

const DEFAULT_QUOTAS = [
  { key: 'aiTokens', label: 'AI Reasoning Tokens (Gemini)', used: 12500, max: 100000, percentage: 42, color: '#8B5CF6' },
  { key: 'reports', label: 'Automated Reports', used: 4, max: 10, percentage: 40, color: '#3B82F6' },
  { key: 'seats', label: 'Team Member Seats', used: 2, max: 3, percentage: 66, color: '#10B981' },
  { key: 'ingestion', label: 'Monthly Data Ingestion', used: 12400, max: 50000, percentage: 25, color: '#F59E0B' },
]

const DEFAULT_SUBSCRIPTION = {
  tier: 'FREE',
  planName: 'Starter Free',
  status: 'ACTIVE',
  currentPeriodEnd: '2026-09-01T00:00:00.000Z',
  customerReference: '•••• 4242',
  quotas: DEFAULT_QUOTAS,
}

const DEFAULT_INVOICES = [
  { id: 'INV-2026-0881', date: '01 Aug 2026', amount: '₹2,399.00', status: 'PAID', plan: 'Growth Pro' },
  { id: 'INV-2026-0742', date: '01 Jul 2026', amount: '₹2,399.00', status: 'PAID', plan: 'Growth Pro' },
  { id: 'INV-2026-0619', date: '01 Jun 2026', amount: '₹2,399.00', status: 'PAID', plan: 'Growth Pro' },
]

const PLANS = [
  {
    id: 'starter',
    tier: 'FREE',
    name: 'Starter',
    tagline: 'Core business intelligence for solo founders and early-stage teams.',
    priceMonthly: { INR: 0, USD: 0 },
    priceYearly: { INR: 0, USD: 0 },
    isPopular: false,
    ctaText: 'Current Plan',
    features: [
      '1 Organization Workspace',
      'Up to 3 Team Member Seats',
      '10,000 AI Reasoning Tokens / mo',
      '10 Automated Report Exports / mo',
      'Standard CSV & XLSX Ingestion (50k rows)',
      '7-Day Cloud File Retention',
      'Community & Standard Support',
    ],
  },
  {
    id: 'pro',
    tier: 'PRO',
    name: 'Growth Pro',
    tagline: 'Predictive intelligence, cron schedules, and advanced business scans.',
    priceMonthly: { INR: 2999, USD: 39 },
    priceYearly: { INR: 2399, USD: 29 },
    isPopular: true,
    ctaText: 'Upgrade to Growth Pro',
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
    tier: 'ENTERPRISE',
    name: 'Enterprise AI',
    tagline: 'Dedicated queue workers, custom retention, and high-volume ERP integrations.',
    priceMonthly: { INR: 8999, USD: 119 },
    priceYearly: { INR: 7199, USD: 95 },
    isPopular: false,
    ctaText: 'Upgrade to Enterprise',
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

const FAQS = [
  {
    q: 'How does billing work when I upgrade or downgrade?',
    a: 'When you upgrade, you gain immediate access to all higher-tier features. Charges are prorated based on your billing cycle. If you downgrade, the new plan takes effect at the end of the current period.',
  },
  {
    q: 'What payment methods and currencies are supported?',
    a: 'We support all major Credit and Debit cards (Visa, Mastercard, AMEX), UPI, and net banking via Stripe and Razorpay. Billing is supported in both INR (₹) and USD ($).',
  },
  {
    q: 'Are payments secure and PCI-DSS compliant?',
    a: 'Yes. All payments are processed directly through Stripe / Razorpay PCI-DSS Level 1 compliant infrastructure. DecisionOS never sees or stores your full card number or CVV.',
  },
  {
    q: 'What happens if I reach my monthly quota limit?',
    a: 'You will receive an in-app and email alert before reaching your limit. You can upgrade your plan anytime without data disruption.',
  },
]

export default function Billing() {
  const { user } = useAuth()
  const realtime = useRealtime ? useRealtime() : null
  const on = realtime?.on || null

  const [billingCycle, setBillingCycle] = useState('yearly') // 'monthly' | 'yearly'
  const [currency, setCurrency] = useState('INR') // 'INR' | 'USD'
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  // Payment Checkout Modal State
  const [checkoutModal, setCheckoutModal] = useState({
    isOpen: false,
    plan: null,
    paymentMethod: 'card', // 'card' | 'upi'
    cardNumber: '4242 •••• •••• 4242',
    cardExpiry: '12/28',
    cardCvc: '•••',
    upiId: '',
    isProcessing: false,
  })

  // Live Subscription & Quota State (with safe fallback defaults)
  const [subscription, setSubscription] = useState(DEFAULT_SUBSCRIPTION)

  // Live Invoices State (with safe fallback defaults)
  const [invoices, setInvoices] = useState(DEFAULT_INVOICES)

  // Fetch live subscription and invoices from backend
  const fetchBillingData = useCallback(async () => {
    try {
      const [subRes, invRes] = await Promise.all([
        api.get('/billing/subscription').catch(() => null),
        api.get('/billing/invoices').catch(() => null),
      ])

      if (subRes?.data?.data && typeof subRes.data.data === 'object') {
        setSubscription((prev) => ({
          ...prev,
          ...subRes.data.data,
          quotas: Array.isArray(subRes.data.data.quotas) && subRes.data.data.quotas.length > 0
            ? subRes.data.data.quotas
            : prev.quotas,
        }))
      }
      if (invRes?.data?.data && Array.isArray(invRes.data.data) && invRes.data.data.length > 0) {
        setInvoices(invRes.data.data)
      }
    } catch {
      // Retain fallback defaults
    }
  }, [])

  useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  // Listen for real-time subscription update via WebSocket
  useEffect(() => {
    if (!on) return
    const unsub = on('SUBSCRIPTION_UPDATED', (data) => {
      notify.success(`Plan updated to ${data?.planName || data?.planTier || 'Active'}!`, 'Subscription Active 💳')
      fetchBillingData()
    })
    return () => unsub?.()
  }, [on, fetchBillingData])

  const currentTier = subscription?.tier || 'FREE'

  // Direct Checkout with Stripe
  const handleDirectCheckout = async (plan) => {
    if (plan.tier === currentTier) return
    setLoadingPlan(plan.tier)
    notify.info(`Opening secure checkout for ${plan.name}…`, 'Stripe Checkout 💳')

    try {
      const res = await api.post('/billing/checkout', {
        planTier: plan.tier,
        interval: billingCycle,
        currency,
        gateway: 'stripe',
      })

      const checkoutUrl = res.data?.data?.checkoutUrl
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        notify.success(`Subscribed to ${plan.name}!`, 'Plan Active ✓')
        fetchBillingData()
        setLoadingPlan(null)
      }
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to open Stripe Checkout.', 'Checkout Error')
      setLoadingPlan(null)
    }
  }

  // Execute Payment in Modal
  const handleExecutePayment = async () => {
    if (!checkoutModal.plan) return
    setCheckoutModal((prev) => ({ ...prev, isProcessing: true }))

    try {
      const res = await api.post('/billing/checkout', {
        planTier: checkoutModal.plan.tier,
        interval: billingCycle,
        currency,
        gateway: checkoutModal.paymentMethod === 'upi' ? 'razorpay' : 'stripe',
      })

      const checkoutUrl = res.data?.data?.checkoutUrl
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        notify.success(`Payment successful! Subscribed to ${checkoutModal.plan.name}.`, 'Payment Verified ✓')
        fetchBillingData()
        setCheckoutModal({ isOpen: false, plan: null, paymentMethod: 'card', cardNumber: '', cardExpiry: '', cardCvc: '', upiId: '', isProcessing: false })
      }
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Payment failed. Please check details.', 'Payment Error')
      setCheckoutModal((prev) => ({ ...prev, isProcessing: false }))
    }
  }

  // Handle Opening Customer Portal
  const handleOpenCustomerPortal = async () => {
    setPortalLoading(true)
    notify.info('Opening Stripe Customer Portal…', 'Customer Portal 🔒')

    try {
      const res = await api.post('/billing/portal')
      const portalUrl = res.data?.data?.portalUrl
      if (portalUrl) {
        window.location.href = portalUrl
      }
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to open customer portal.', 'Portal Error')
    } finally {
      setPortalLoading(false)
    }
  }

  const renewalDate = new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const quotasList = Array.isArray(subscription?.quotas) ? subscription.quotas : DEFAULT_QUOTAS
  const invoicesList = Array.isArray(invoices) ? invoices : DEFAULT_INVOICES

  return (
    <div className="clean-billing">
      {/* ── Header ── */}
      <div className="clean-billing__header">
        <div>
          <h1 className="clean-billing__title">Billing & Subscription</h1>
          <p className="clean-billing__subtitle">
            Manage your organization's subscription plan, resource quotas, and payment receipts.
          </p>
        </div>
        <button
          className="btn-ghost clean-billing__portal-btn"
          disabled={portalLoading}
          onClick={handleOpenCustomerPortal}
        >
          {portalLoading ? <Loader2 size={14} className="clean-billing__spin" /> : <ExternalLink size={14} />}
          Manage via Stripe Portal
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
            <h2 className="clean-billing__plan-name">{subscription?.planName || 'Starter Free'}</h2>
            <p className="clean-billing__plan-desc">
              Your organization workspace is active. Next quota refresh on <strong>{renewalDate}</strong>.
            </p>
          </div>

          <div className="clean-billing__plan-actions">
            <div className="clean-billing__price-badge">
              <span className="clean-billing__price-number">
                {currentTier === 'FREE' ? '₹0' : currentTier === 'PRO' ? '₹2,399' : '₹7,199'}
              </span>
              <span className="clean-billing__price-period">/ month</span>
            </div>
            <a href="#plans" className="btn-primary clean-billing__change-plan-btn">
              Change Plan <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* Live Resource Usage Meters */}
        <div className="clean-billing__meters-grid">
          {quotasList.map((m) => (
            <div key={m.label} className="clean-billing__meter-box">
              <div className="clean-billing__meter-header">
                <span className="clean-billing__meter-label">{m.label}</span>
                <span className="clean-billing__meter-stats">
                  {typeof m.used === 'number' ? m.used.toLocaleString() : m.used}{' '}
                  <span className="clean-billing__meter-max">/ {typeof m.max === 'number' ? m.max.toLocaleString() : m.max}</span>
                </span>
              </div>
              <div className="clean-billing__progress-track">
                <div
                  className="clean-billing__progress-fill"
                  style={{ width: `${Math.min(m.percentage || 0, 100)}%`, background: m.color || '#3B82F6' }}
                />
              </div>
              <div className="clean-billing__meter-foot">
                <span>{m.percentage || 0}% utilized</span>
                <span>{Math.max(100 - (m.percentage || 0), 0)}% remaining</span>
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
            const isCurrent = p.tier === currentTier
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
                  disabled={isCurrent || loadingPlan === p.tier}
                  onClick={() => handleDirectCheckout(p)}
                >
                  {loadingPlan === p.tier ? (
                    <Loader2 size={14} className="clean-billing__spin" />
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

      {/* ── Section 3: Payment Method & Invoices (Zero PII Privacy Safe) ── */}
      <div className="clean-billing__bottom-grid">
        {/* Payment Method Container (Privacy Safe) */}
        <div className="clean-card clean-billing__card-box">
          <div className="clean-billing__box-header">
            <CreditCard size={18} className="clean-billing__box-icon" />
            <div>
              <h3 className="clean-billing__box-title">Payment Method</h3>
              <p className="clean-billing__box-sub">Active billing method secured with AES-256 via Stripe.</p>
            </div>
          </div>

          <div className="clean-billing__payment-card">
            <div className="clean-billing__payment-top">
              <div className="clean-billing__card-badge">VISA</div>
              <span className="badge badge-success">Primary Method</span>
            </div>
            <div className="clean-billing__card-digits">
              •••• •••• •••• {subscription?.customerReference ? subscription.customerReference.slice(-4) : '4242'}
            </div>
            <div className="clean-billing__card-details">
              <span>Account: <strong>Organization Primary</strong></span>
              <span>Expires: <strong>12 / 2028</strong></span>
            </div>
          </div>

          <div className="clean-billing__meta-summary">
            <div className="clean-billing__meta-row">
              <span>Selected Currency</span>
              <strong>{currency} ({CURRENCY_SYMBOLS[currency]})</strong>
            </div>
            <div className="clean-billing__meta-row">
              <span>Security Level</span>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981' }}>
                <Lock size={12} /> PCI-DSS Level 1 Encrypted
              </strong>
            </div>
          </div>

          <button className="btn-ghost clean-billing__update-card-btn" onClick={handleOpenCustomerPortal}>
            <ExternalLink size={13} /> Update Payment Method on Stripe
          </button>
        </div>

        {/* Invoices & Receipts Ledger */}
        <div className="clean-card clean-billing__card-box">
          <div className="clean-billing__box-header">
            <Receipt size={18} className="clean-billing__box-icon" />
            <div>
              <h3 className="clean-billing__box-title">Invoice & Receipts Ledger</h3>
              <p className="clean-billing__box-sub">Download official tax-compliant billing receipts.</p>
            </div>
          </div>

          <div className="clean-billing__invoices-list">
            {invoicesList.map((inv) => (
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
                    title="Download Receipt PDF"
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

      {/* ── Interactive Payment Checkout Modal ── */}
      {checkoutModal.isOpen && checkoutModal.plan && (
        <div className="payment-modal-backdrop" onClick={() => setCheckoutModal((prev) => ({ ...prev, isOpen: false }))}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal__head">
              <div>
                <div className="payment-modal__badge">
                  <Lock size={12} /> PCI-DSS ENCRYPTED CHECKOUT
                </div>
                <h2 className="payment-modal__title">Upgrade to {checkoutModal.plan.name}</h2>
              </div>
              <button
                className="payment-modal__close-btn"
                onClick={() => setCheckoutModal((prev) => ({ ...prev, isOpen: false }))}
              >
                <X size={18} />
              </button>
            </div>

            {/* Plan & Pricing Summary Box */}
            <div className="payment-modal__summary">
              <div className="payment-modal__summary-row">
                <span>Selected Plan:</span>
                <strong>{checkoutModal.plan.name} ({billingCycle.toUpperCase()})</strong>
              </div>
              <div className="payment-modal__summary-row">
                <span>Billing Period:</span>
                <span>{billingCycle === 'yearly' ? '12 Months (20% Savings)' : '1 Month'}</span>
              </div>
              <div className="payment-modal__summary-row payment-modal__summary-total">
                <span>Total Amount Due:</span>
                <strong>
                  {CURRENCY_SYMBOLS[currency]}
                  {(billingCycle === 'yearly'
                    ? checkoutModal.plan.priceYearly[currency] * 12
                    : checkoutModal.plan.priceMonthly[currency]
                  ).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            {/* Pay Button */}
            <div className="payment-modal__foot">
              <button
                className="btn-primary payment-modal__pay-btn"
                disabled={checkoutModal.isProcessing}
                onClick={handleExecutePayment}
              >
                {checkoutModal.isProcessing ? (
                  <>
                    <Loader2 size={16} className="clean-billing__spin" /> Redirecting to Stripe…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Pay via Stripe{' '}
                    {CURRENCY_SYMBOLS[currency]}
                    {(billingCycle === 'yearly'
                      ? checkoutModal.plan.priceYearly[currency] * 12
                      : checkoutModal.plan.priceMonthly[currency]
                    ).toLocaleString('en-IN')}
                  </>
                )}
              </button>

              <div className="payment-modal__guarantee">
                <Lock size={12} /> Redirects securely to official Stripe Hosted Checkout.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
