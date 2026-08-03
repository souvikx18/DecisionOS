import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import logoImg from '../../assets/logo.png'
import './Auth.css'

const INDUSTRIES = ['Manufacturing', 'Retail', 'Distribution', 'Services', 'Pharma', 'Food & Beverage', 'Other']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', company: '', industry: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const update = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  const nextStep = (e) => {
    e.preventDefault()
    if (!form.name || !form.email) { toast.error('Fill in your name and email'); return }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.company || !form.industry) { toast.error('Fill in company details'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to DecisionOS 🎉')
      navigate('/dashboard')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left__inner">
          <Link to="/" className="auth-logo">
            <img src={logoImg} alt="DecisionOS" className="auth-logo__img" />
          </Link>
          <div className="auth-left__badge"><span>✦</span> Free 14-day trial. No credit card needed.</div>
          <h2 className="auth-left__title">Start making data-driven decisions in 5 minutes.</h2>
          <ul className="auth-left__checklist">
            {['Upload your Excel/CSV data instantly', 'AI insights generated automatically', 'Real-time dashboard out of the box', 'Notifications for critical events'].map(item => (
              <li key={item}><span className="auth-left__check">✓</span> {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          {/* Step indicator */}
          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'auth-step--active' : ''}`}>
              <div className="auth-step__dot">1</div>
              <span>Your Info</span>
            </div>
            <div className="auth-step__line" />
            <div className={`auth-step ${step >= 2 ? 'auth-step--active' : ''}`}>
              <div className="auth-step__dot">2</div>
              <span>Company</span>
            </div>
          </div>

          <h1 className="auth-title">{step === 1 ? 'Create your account' : 'Set up your company'}</h1>
          <p className="auth-sub">{step === 1 ? 'Start your free 14-day trial today' : 'Tell us about your business'}</p>

          {step === 1 ? (
            <form className="auth-form" onSubmit={nextStep} id="register-step1">
              <div className="auth-field">
                <label htmlFor="reg-name">Full name</label>
                <input id="reg-name" type="text" className="input-field" placeholder="Arjun Mehta" value={form.name} onChange={update('name')} />
              </div>
              <div className="auth-field">
                <label htmlFor="reg-email">Work email</label>
                <input id="reg-email" type="email" className="input-field" placeholder="arjun@yourcompany.com" value={form.email} onChange={update('email')} />
              </div>
              <button type="submit" className="btn-primary auth-submit" id="register-next">
                Continue <ArrowRight size={15} />
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} id="register-step2">
              <div className="auth-field">
                <label htmlFor="reg-company">Company name</label>
                <input id="reg-company" type="text" className="input-field" placeholder="Acme Corp" value={form.company} onChange={update('company')} />
              </div>
              <div className="auth-field">
                <label htmlFor="reg-industry">Industry</label>
                <select id="reg-industry" className="input-field" value={form.industry} onChange={update('industry')}>
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="reg-password">Password</label>
                <div className="auth-pass-wrap">
                  <input id="reg-password" type={showPass ? 'text' : 'password'} className="input-field" placeholder="Min. 8 characters" value={form.password} onChange={update('password')} />
                  <button type="button" className="auth-pass-toggle" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="reg-confirm">Confirm password</label>
                <input id="reg-confirm" type="password" className="input-field" placeholder="Re-enter password" value={form.confirm} onChange={update('confirm')} />
              </div>
              <div className="auth-form-row">
                <button type="button" className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="btn-primary auth-submit-sm" disabled={loading} id="register-submit">
                  {loading ? 'Creating…' : (<>Create Account <ArrowRight size={15} /></>)}
                </button>
              </div>
            </form>
          )}

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
