import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  TrendingUp, Package, Users, DollarSign, Bell,
  BarChart2, ArrowRight, Check, Star, Zap,
  Sun, Moon, Menu, X, Sparkles, Building2
} from 'lucide-react'
import logoImg from '../assets/logo.png'
import './Landing.css'

const FEATURES = [
  { icon: TrendingUp, color: '#1D4ED8', title: 'Sales Intelligence', desc: 'Detect revenue drops, predict trends, and understand why sales change — automatically.' },
  { icon: Package,    color: '#10B981', title: 'Inventory Forecasting', desc: 'Know exactly when stock will run out before it happens. Automated purchase order triggers.' },
  { icon: Users,      color: '#6366F1', title: 'Customer Churn Prediction', desc: 'Identify at-risk customers before they leave. AI-powered re-engagement recommendations.' },
  { icon: DollarSign, color: '#F59E0B', title: 'Expense Analysis', desc: 'Spot spending anomalies and cost overruns instantly. Category-level breakdowns in real time.' },
  { icon: BarChart2,  color: '#EF4444', title: 'Real-Time Dashboard', desc: 'All your business metrics in one place — revenue, sales, inventory, and top customers.' },
  { icon: Bell,       color: '#64748B', title: 'Smart Notifications', desc: 'Get alerts for low stock, customer inactivity, sales drops, and expense spikes instantly.' },
]

const PLANS = [
  {
    name: 'Free Trial',
    price: '₹0',
    period: '14 days',
    desc: 'Explore all features risk-free',
    icon: Zap,
    highlight: false,
    features: ['Up to 2 users', 'Basic dashboard', 'CSV upload (5 files/mo)', 'Email support'],
    cta: 'Start Free Trial',
  },
  {
    name: 'Basic',
    price: '₹2,999',
    period: '/month',
    desc: 'For small teams getting started',
    icon: TrendingUp,
    highlight: false,
    features: ['Up to 10 users', 'Full dashboard', 'Unlimited CSV upload', 'AI Insights (basic)', 'PDF reports'],
    cta: 'Get Started',
  },
  {
    name: 'Pro',
    price: '₹7,499',
    period: '/month',
    desc: 'Full AI intelligence & predictive alerts',
    icon: Sparkles,
    highlight: true,
    badge: 'Most Popular',
    features: ['Up to 50 users', 'Full dashboard + AI', 'Churn prediction', 'Sales forecasting', 'Priority support', 'Custom reports'],
    cta: 'Start Pro Trial',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Dedicated infrastructure & custom models',
    icon: Building2,
    highlight: false,
    features: ['Unlimited users', 'Dedicated AI model', 'API access', 'Custom integrations', 'SLA guarantee', 'Onboarding support'],
    cta: 'Contact Sales',
  },
]

const TESTIMONIALS = [
  { name: 'Aarav Sharma', role: 'CEO, NexGen Textiles', stars: 5, text: 'DecisionOS flagged a 30% sales drop before I even noticed it on my spreadsheet. Saved us from a bad quarter.' },
  { name: 'Rahul Gupta',  role: 'Operations Head, FastMove Logistics', stars: 5, text: "Inventory forecasting alone is worth 10x the subscription cost. We haven't had a stockout in 3 months." },
  { name: 'Anita Desai',  role: 'Founder, Spice Route Distributors', stars: 4, text: "The churn alerts helped us re-engage 4 customers we'd have otherwise lost. Simple, powerful, and surprisingly affordable." },
]

const NAV_LINKS = [
  { href: '#features',     label: 'Features' },
  { href: '#pricing',      label: 'Pricing' },
  { href: '#testimonials', label: 'Testimonials' },
]

export default function Landing() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isDark = theme === 'dark'

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={`landing ${isDark ? 'landing--dark' : ''}`}>

      {/* ── REDESIGNED NAVBAR ─────────────────────────────────────── */}
      <nav className={`lnav ${scrolled ? 'lnav--scrolled' : ''}`}>
        <div className="lnav__inner">

          {/* Logo */}
          <a href="/" className="lnav__logo">
            <img src={logoImg} alt="DecisionOS" className="lnav__logo-img" />
            <span className="lnav__logo-text">
              Decision<span className="lnav__logo-accent">OS</span>
            </span>
            <span className="lnav__logo-badge">Beta</span>
          </a>

          {/* Center nav links */}
          <ul className="lnav__links">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a href={href} className="lnav__link">
                  {label}
                  <span className="lnav__link-underline" />
                </a>
              </li>
            ))}
          </ul>

          {/* Right controls */}
          <div className="lnav__right">
            {/* Theme toggle */}
            <button
              className="lnav__theme-btn"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              id="theme-toggle"
            >
              <span className={`lnav__theme-icon ${isDark ? 'lnav__theme-icon--active' : ''}`}>
                <Sun size={15} strokeWidth={2} />
              </span>
              <span className="lnav__theme-track">
                <span className={`lnav__theme-thumb ${isDark ? 'lnav__theme-thumb--dark' : ''}`} />
              </span>
              <span className={`lnav__theme-icon ${!isDark ? 'lnav__theme-icon--active' : ''}`}>
                <Moon size={15} strokeWidth={2} />
              </span>
            </button>

            {/* Divider */}
            <div className="lnav__divider" />

            {/* Sign in */}
            <button
              className="lnav__signin"
              onClick={() => navigate('/login')}
              id="nav-signin"
            >
              Sign in
            </button>

            {/* CTA */}
            <button
              className="lnav__cta"
              onClick={() => navigate('/register')}
              id="nav-get-started"
            >
              Get Started
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>

            {/* Mobile hamburger */}
            <button
              className="lnav__hamburger"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lnav__mobile">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="lnav__mobile-link" onClick={() => setMobileOpen(false)}>
                {label}
              </a>
            ))}
            <div className="lnav__mobile-actions">
              <button className="lnav__signin" onClick={() => navigate('/login')}>Sign in</button>
              <button className="lnav__cta" onClick={() => navigate('/register')}>
                Get Started <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="landing__hero">
        <div className="landing__hero-badge">
          <Zap size={12} />
          AI-Powered Business Intelligence for Indian SMBs
        </div>
        <h1 className="landing__hero-title">
          Stop Guessing.<br />
          Start <span className="landing__hero-accent">Deciding</span>.
        </h1>
        <p className="landing__hero-sub">
          DecisionOS analyzes your sales, inventory, customers, and expenses in one place —
          then tells you exactly what needs your attention right now.
        </p>
        <div className="landing__hero-ctas">
          <button className="btn-primary landing__cta-main" onClick={() => navigate('/register')}>
            Start Free 14-Day Trial <ArrowRight size={16} />
          </button>
          <button className="btn-ghost landing__cta-sec" onClick={() => navigate('/login')}>
            Sign in to your account
          </button>
        </div>
        <p className="landing__hero-note">No credit card required · Setup in 5 minutes</p>

        {/* Hero dashboard preview */}
        <div className="landing__hero-preview">
          <div className="landing__preview-bar">
            <span /><span /><span />
          </div>
          <div className="landing__preview-grid">
            {[
              { label: 'Revenue', val: '₹48.3L', change: '+12.4%', up: true },
              { label: 'Sales', val: '1,284', change: '+8.1%', up: true },
              { label: 'Expenses', val: '₹12.7L', change: '-3.2%', up: false },
              { label: 'AI Alerts', val: '4', change: 'Active', up: null },
            ].map(c => (
              <div key={c.label} className="landing__preview-card">
                <div className="landing__preview-label">{c.label}</div>
                <div className="landing__preview-val">{c.val}</div>
                <div className={`landing__preview-change ${c.up === true ? 'up' : c.up === false ? 'down' : 'neutral'}`}>
                  {c.change}
                </div>
              </div>
            ))}
          </div>
          <div className="landing__preview-insight">
            <div className="landing__preview-dot critical" />
            <span>Industrial Bearings 6205 will run out in <strong>5 days</strong> — Create PO now</span>
          </div>
          <div className="landing__preview-insight">
            <div className="landing__preview-dot warning" />
            <span>Mahindra Agri Solutions hasn't purchased in <strong>45 days</strong> — Churn risk: HIGH</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing__section">
        <div className="landing__section-inner">
          <div className="landing__section-label">CAPABILITIES</div>
          <h2 className="landing__section-title">Everything Your Business Needs to Decide Faster</h2>
          <p className="landing__section-sub">Upload your Excel or CSV data, and let our AI surface the insights that matter most.</p>
          <div className="landing__features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="landing__feature-card glass-card">
                <div className="landing__feature-icon" style={{ background: f.color + '18', color: f.color }}>
                  <f.icon size={20} strokeWidth={1.75} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing__section landing__section--alt">
        <div className="landing__section-inner">
          <div className="landing__section-label">PRICING</div>
          <h2 className="landing__section-title">Simple, Transparent Pricing</h2>
          <p className="landing__section-sub">Start free for 14 days. No credit card required.</p>
          
          <div className="landing__pricing-grid">
            {PLANS.map(p => {
              const IconComp = p.icon
              return (
                <div
                  key={p.name}
                  className={`plan-card ${p.highlight ? 'plan-card--highlight' : ''}`}
                >
                  {p.badge && (
                    <div className="plan-card__badge">
                      <Sparkles size={11} strokeWidth={2.5} />
                      {p.badge}
                    </div>
                  )}

                  <div className="plan-card__header">
                    <div className="plan-card__icon-wrapper">
                      <IconComp size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="plan-card__title">{p.name}</h3>
                      <p className="plan-card__desc">{p.desc}</p>
                    </div>
                  </div>

                  <div className="plan-card__price-box">
                    <span className="plan-card__amount">{p.price}</span>
                    {p.period && <span className="plan-card__period">{p.period}</span>}
                  </div>

                  <div className="plan-card__divider" />

                  <ul className="plan-card__features">
                    {p.features.map(f => (
                      <li key={f}>
                        <div className="plan-card__check">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={p.highlight ? 'plan-card__btn plan-card__btn--primary' : 'plan-card__btn plan-card__btn--secondary'}
                    onClick={() => navigate('/register')}
                  >
                    <span>{p.cta}</span>
                    {p.highlight && <ArrowRight size={14} strokeWidth={2.5} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="landing__section">
        <div className="landing__section-inner">
          <div className="landing__section-label">TESTIMONIALS</div>
          <h2 className="landing__section-title">Trusted by Indian Business Owners</h2>
          <div className="landing__testimonials-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="landing__testimonial glass-card">
                <div className="landing__stars">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} fill="#F59E0B" color="#F59E0B" />
                  ))}
                </div>
                <p className="landing__testimonial-text">"{t.text}"</p>
                <div className="landing__testimonial-author">
                  <div className="landing__testimonial-avatar">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="landing__testimonial-name">{t.name}</div>
                    <div className="landing__testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="landing__cta-banner">
        <div className="landing__cta-banner-inner">
          <h2>Ready to Make Better Business Decisions?</h2>
          <p>Join hundreds of Indian SMBs already using DecisionOS to stay ahead.</p>
          <button className="btn-primary landing__cta-main" onClick={() => navigate('/register')}>
            Start Your Free Trial <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__container">
          <div className="footer__grid">
            {/* Brand Column */}
            <div className="footer__brand-col">
              <a href="/" className="footer__logo">
                <img src={logoImg} alt="DecisionOS" className="footer__logo-img" />
                <span className="footer__logo-text">
                  Decision<span className="lnav__logo-accent">OS</span>
                </span>
              </a>
              <p className="footer__brand-desc">
                AI-powered Business Intelligence for Indian SMBs. Analyze sales, inventory, churn, and expenses in one unified platform.
              </p>
              <div className="footer__status">
                <span className="footer__status-dot" />
                <span>All Systems Operational</span>
              </div>
            </div>

            {/* Product Links */}
            <div className="footer__nav-col">
              <h4 className="footer__col-title">Product</h4>
              <ul className="footer__links">
                <li><a href="#features">Sales Intelligence</a></li>
                <li><a href="#features">Inventory Forecasting</a></li>
                <li><a href="#features">Churn Prediction</a></li>
                <li><a href="#features">Expense Analysis</a></li>
                <li><a href="#pricing">Pricing Plans</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="footer__nav-col">
              <h4 className="footer__col-title">Company</h4>
              <ul className="footer__links">
                <li><a href="#testimonials">Customer Stories</a></li>
                <li><a href="#features">About Us</a></li>
                <li><a href="/login">Sign In</a></li>
                <li><a href="/register">Free Trial</a></li>
                <li><a href="#">Careers</a></li>
              </ul>
            </div>

            {/* Legal & Support Links */}
            <div className="footer__nav-col">
              <h4 className="footer__col-title">Legal & Support</h4>
              <ul className="footer__links">
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Security & Trust</a></li>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Contact Sales</a></li>
              </ul>
            </div>
          </div>

          {/* Sub-footer */}
          <div className="footer__bottom">
            <p className="footer__copyright">
              © 2026 DecisionOS Technologies Pvt. Ltd. All rights reserved.
            </p>
            <p className="footer__made-with">
              Built for Indian Distributors, Retailers & Manufacturers
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
