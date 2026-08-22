import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { notify } from '../../components/ui/CustomToast'
import AnimatedLogo from './AnimatedLogo'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      notify.error('Please enter both work email and password.', 'Required Fields')
      return
    }
    setLoading(true)
    try {
      await login(form.email, form.password)
      notify.success('Session authenticated. Redirecting to workspace…', 'Welcome Back! 👋')
      navigate('/dashboard')
    } catch (err) {
      const errData = err.response?.data?.error
      const msg = errData?.details?.[0]?.message || errData?.message || err.message || 'Please check your credentials and try again.'
      notify.error(msg, 'Authentication Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left__inner">

          {/* ── Crazy animated logo ── */}
          <AnimatedLogo />

          <div className="auth-left__badge">
            <span>✦</span> Trusted by 500+ Indian businesses
          </div>
          <h2 className="auth-left__title">Make smarter decisions with AI-powered insights.</h2>
          <div className="auth-left__stats">
            {[
              { val: '₹240Cr+', label: 'Revenue tracked' },
              { val: '98%', label: 'Customer satisfaction' },
              { val: '5 min', label: 'Setup time' },
            ].map(s => (
              <div key={s.label} className="auth-left__stat">
                <span className="auth-left__stat-val">{s.val}</span>
                <span className="auth-left__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your DecisionOS account</p>

          <form className="auth-form" onSubmit={handleSubmit} id="login-form">
            <div className="auth-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="arjun@yourcompany.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <div className="auth-field__label-row">
                <label htmlFor="login-password">Password</label>
                <a href="#" className="auth-forgot">Forgot password?</a>
              </div>
              <div className="auth-pass-wrap">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                />
                <button type="button" className="auth-pass-toggle" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary auth-submit" disabled={loading} id="login-submit">
              {loading ? 'Signing in…' : (<>Sign in <ArrowRight size={15} /></>)}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
