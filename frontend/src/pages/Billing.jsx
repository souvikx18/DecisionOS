// src/pages/Billing.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard, Check, Sparkles, ArrowRight,
  Download, RefreshCw, HelpCircle,
  Receipt, Loader2, Lock, ChevronDown, ChevronUp,
  ShieldCheck, Zap, QrCode
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
    cta: 'Current Plan',
    features: [
      '1 Organization Workspace',
      'Up to 3 Team Member Seats',
      '10,000 AI Reasoning Tokens / mo',
      '10 Automated Report Exports / mo',
      'Standard CSV & XLSX Ingestion (50,000 rows)',
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
    priceYearly: { INR: 2399, USD: 29 }, // ~20% discount
    isPopular: true,
    cta: 'Upgrade to Growth Pro',
    badge: 'MOST POPULAR',
    features: [
      'Unlimited Workspaces',
      'Up to 15 Team Member Seats',
      '250,000 AI Tokens / mo (Gemini 3.6 Flash)',
      'Unlimited Cron PDF, XLSX & CSV Exports',
      '30-Day Cloud File Retention + Purger',
      'RFM Customer Segmentation & Churn Matrix',
      'Priority 24/7 Support',
      'UPI, Cards, RuPay & NetBanking Support',
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
    cta: 'Upgrade to Enterprise',
    features: [
      'Unlimited Workspaces & Team Seats',
      '1,000,000+ AI Tokens / mo',
      'Dedicated BullMQ Isolated Queue Worker',
      'Unlimited Custom Report Formats',
      'Custom Retention (90+ Days / Permanent)',
      'Custom ERP API & Webhook Integrations',
      '99.9% Uptime SLA & Dedicated Account Lead',
      'Direct Wire / Custom Invoicing Support',
    ],
  },
]

const FAQS = [
  {
    q: 'What payment methods are supported with Razorpay?',
    a: 'Razorpay natively supports UPI (Google Pay, PhonePe, Paytm, BHIM), all major Credit/Debit cards (Visa, Mastercard, RuPay), NetBanking from 50+ banks, and Digital Wallets.',
  },
  {
    q: 'Can I change my plan or billing cycle at any time?',
    a: 'Yes. Upgrades take effect immediately with pro-rated billing. Downgrades take effect at the end of your current billing period without unexpected charges.',
  },
  {
    q: 'What happens when I exceed my resource quotas?',
    a: 'Your workspace remains active. When you reach 100% of a quota (such as AI reasoning tokens or automated exports), further operations in that category are throttled until the quota refreshes at the next billing cycle, or until you upgrade.',
  },
  {
    q: 'Are my payment details secure?',
    a: 'Yes. All payments are processed through Razorpay with 256-bit SSL encryption and full PCI-DSS Level 1 compliance. DecisionOS never stores your raw card numbers or banking PINs.',
  },
  {
    q: 'Do you offer a refund policy?',
    a: 'Yes. If you are unsatisfied with your paid subscription within the first 14 days, contact our support team for a full refund without questions asked.',
  },
]

// Helper to dynamically load the Razorpay checkout.js script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Billing() {
  const { user } = useAuth()
  const { on } = useRealtime()

  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
  const [currency, setCurrency] = useState('INR') // 'INR' | 'USD'
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  // Live Subscription & Quota State
  const [subscription, setSubscription] = useState(DEFAULT_SUBSCRIPTION)

  // Live Invoices State
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
    loadRazorpayScript()
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

  // Direct Checkout with Razorpay
  const handleDirectCheckout = async (plan) => {
    if (plan.tier === 'FREE') {
      notify.info('You are currently on the Starter Free tier. Select Growth Pro or Enterprise to upgrade.', 'Starter Plan 🚀')
      return
    }
    if (plan.tier === currentTier) {
      notify.info(`You are already subscribed to the ${plan.name} plan.`, 'Current Plan')
      return
    }
    setLoadingPlan(plan.tier)
    notify.info(`Opening secure Razorpay checkout for ${plan.name}…`, 'Razorpay Checkout 💳')


    try {
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded && !window.Razorpay) {
        notify.error('Razorpay SDK failed to load. Please check your network.', 'Checkout Error')
        setLoadingPlan(null)
        return
      }

      const res = await api.post('/billing/checkout', {
        planTier: plan.tier,
        interval: billingCycle,
        currency,
        gateway: 'razorpay',
      })

      const orderData = res.data?.data
      if (!orderData) {
        throw new Error('Failed to create Razorpay checkout order.')
      }

      // If simulated fallback in dev
      if (orderData.simulated) {
        notify.info('Simulating local payment verification…', 'Test Mode 🧪')
        await api.post('/billing/verify-payment', {
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          razorpaySignature: 'simulated_signature_dev',
          planTier: plan.tier,
          interval: billingCycle,
          currency,
        })
        notify.success(`Plan upgraded to ${plan.name}!`, 'Plan Active 🎉')
        fetchBillingData()
        setLoadingPlan(null)
        return
      }

      // Live / Test Mode Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DecisionOS',
        description: `${orderData.planName} Plan (${billingCycle})`,
        order_id: orderData.orderId,
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'DecisionOS Admin',
          email: user?.email || 'admin@decisionos.com',
          contact: '9999999999',
        },

        notes: {
          planTier: plan.tier,
          interval: billingCycle,
        },
        theme: {
          color: '#0F172A',
        },
        modal: {
          ondismiss: () => {
            notify.info('Payment was cancelled.', 'Razorpay Checkout')
            setLoadingPlan(null)
          },
        },
        handler: async (response) => {
          try {
            notify.info('Verifying payment signature…', 'Verifying 🔒')
            await api.post('/billing/verify-payment', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planTier: plan.tier,
              interval: billingCycle,
              currency,
            })
            notify.success(`Successfully upgraded to ${plan.name}!`, 'Payment Complete 🎉')
            fetchBillingData()
          } catch (err) {
            notify.error(err.response?.data?.error?.message || 'Payment verification failed.', 'Verification Error')
          } finally {
            setLoadingPlan(null)
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        notify.error(response.error?.description || 'Payment failed. Please try again.', 'Payment Failed')
        setLoadingPlan(null)
      })
      rzp.open()
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to initiate Razorpay checkout.', 'Checkout Error')
      setLoadingPlan(null)
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
            Manage your organization's subscription plan, resource quotas, and payment receipts via Razorpay.
          </p>
        </div>
        <button
          className="btn-ghost clean-billing__portal-btn"
          onClick={() => fetchBillingData()}
        >
          <RefreshCw size={14} />
          Refresh Status
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
                  style={{
                    width: `${m.percentage}%`,
                    backgroundColor: m.percentage > 85 ? '#EF4444' : m.color || '#3B82F6',
                  }}
                />
              </div>
              <div className="clean-billing__meter-footer">
                <span>{m.percentage}% consumed</span>
                <span>{m.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Pricing Tiers & Upgrade Cards ── */}
      <div className="clean-billing__plans-section" id="plans">
        <div className="clean-billing__plans-header">
          <div>
            <h2 className="clean-billing__section-title">Available Subscription Plans</h2>
            <p className="clean-billing__section-sub">
              Scale decision intelligence with predictive models, cron exports, and automated reports.
            </p>
          </div>

          <div className="clean-billing__controls-cluster">
            {/* Currency Selector */}
            <div className="clean-billing__currency-pill">
              <button
                className={`clean-billing__curr-btn ${currency === 'INR' ? 'clean-billing__curr-btn--active' : ''}`}
                onClick={() => setCurrency('INR')}
              >
                INR (₹)
              </button>
              <button
                className={`clean-billing__curr-btn ${currency === 'USD' ? 'clean-billing__curr-btn--active' : ''}`}
                onClick={() => setCurrency('USD')}
              >
                USD ($)
              </button>
            </div>

            {/* Billing Frequency Toggle */}
            <div className="clean-billing__toggle-pill">
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
                Annual <span className="clean-billing__save-tag">SAVE 20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="clean-billing__cards-grid">
          {PLANS.map((plan) => {
            const isCurrent = plan.tier === currentTier
            const price = billingCycle === 'yearly' ? plan.priceYearly[currency] : plan.priceMonthly[currency]
            const isLoading = loadingPlan === plan.tier

            return (
              <div
                key={plan.id}
                className={`clean-card clean-billing__card ${
                  plan.isPopular ? 'clean-billing__card--popular' : ''
                } ${isCurrent ? 'clean-billing__card--current' : ''}`}
              >
                {plan.badge && <div className="clean-billing__popular-badge">{plan.badge}</div>}

                <div className="clean-billing__card-top">
                  <div className="clean-billing__tier-icon">
                    {plan.tier === 'FREE' ? <Zap size={20} /> : plan.tier === 'PRO' ? <Sparkles size={20} /> : <ShieldCheck size={20} />}
                  </div>
                  <h3 className="clean-billing__card-tier-name">{plan.name}</h3>
                  <p className="clean-billing__card-tagline">{plan.tagline}</p>
                </div>

                <div className="clean-billing__card-pricing">
                  <div className="clean-billing__price-row">
                    <span className="clean-billing__currency-sign">{CURRENCY_SYMBOLS[currency]}</span>
                    <span className="clean-billing__price-val">{price.toLocaleString('en-IN')}</span>
                    <span className="clean-billing__period-sub">/ mo</span>
                  </div>
                  <div className="clean-billing__billing-note">
                    {billingCycle === 'yearly' && price > 0
                      ? `Billed annually (${CURRENCY_SYMBOLS[currency]}${(price * 12).toLocaleString('en-IN')} / yr)`
                      : 'Billed monthly, cancel anytime'}
                  </div>
                </div>

                <ul className="clean-billing__feature-list">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="clean-billing__feature-item">
                      <Check size={14} className="clean-billing__check-icon" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`btn clean-billing__cta-btn ${
                    isCurrent
                      ? 'btn-secondary clean-billing__cta--current'
                      : plan.isPopular
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  disabled={isCurrent || isLoading}
                  onClick={() => handleDirectCheckout(plan)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="clean-billing__spin" /> Processing Razorpay…
                    </>
                  ) : isCurrent ? (
                    'Current Active Plan'
                  ) : (
                    <>
                      {plan.cta} <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 3: Payment Methods & Invoice History ── */}
      <div className="clean-billing__bottom-grid">
        {/* Payment Methods */}
        <div className="clean-card clean-billing__card-box">
          <div className="clean-billing__box-header">
            <CreditCard size={18} className="clean-billing__box-icon" />
            <div>
              <h3 className="clean-billing__box-title">Supported Payment Channels</h3>
              <p className="clean-billing__box-sub">Pay via instant UPI, Cards, NetBanking, and RuPay.</p>
            </div>
          </div>

          <div className="clean-billing__payment-preview">
            <div className="clean-billing__card-type-row">
              <div className="clean-billing__card-badge" style={{ background: '#0F172A', color: '#fff' }}>RAZORPAY</div>
              <span className="badge badge-success">UPI / CARDS / NETBANKING</span>
            </div>
            <div className="clean-billing__card-digits">
              UPI · Google Pay · PhonePe · RuPay · Visa · Mastercard
            </div>
            <div className="clean-billing__card-details">
              <span>Security: <strong>256-Bit SSL Encryption</strong></span>
              <span>Compliance: <strong>PCI-DSS Level 1</strong></span>
            </div>
          </div>

          <div className="clean-billing__meta-summary">
            <div className="clean-billing__meta-row">
              <span>Active Gateway</span>
              <strong>Razorpay Native Gateway (India & Global)</strong>
            </div>
            <div className="clean-billing__meta-row">
              <span>Settlement Currency</span>
              <strong>{currency} ({CURRENCY_SYMBOLS[currency]})</strong>
            </div>
            <div className="clean-billing__meta-row">
              <span>Security Level</span>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981' }}>
                <Lock size={12} /> HMAC-SHA256 Cryptographic Verification
              </strong>
            </div>
          </div>
        </div>

        {/* Invoices & Receipts Ledger */}
        <div className="clean-card clean-billing__card-box">
          <div className="clean-billing__box-header">
            <Receipt size={18} className="clean-billing__box-icon" />
            <div>
              <h3 className="clean-billing__box-title">Invoice & Receipts Ledger</h3>
              <p className="clean-billing__box-sub">Tax-compliant billing receipts & transaction records.</p>
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
            Invoices and payment receipts are generated automatically upon successful Razorpay transaction.
          </div>
        </div>
      </div>

      {/* ── Section 4: FAQs ── */}
      <div className="clean-card clean-billing__faqs-box">
        <div className="clean-billing__box-header">
          <HelpCircle size={18} className="clean-billing__box-icon" />
          <div>
            <h3 className="clean-billing__box-title">Frequently Asked Questions</h3>
            <p className="clean-billing__box-sub">Everything you need to know about plans, Razorpay payments, and quotas.</p>
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
