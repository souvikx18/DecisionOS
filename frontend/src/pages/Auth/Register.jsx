import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, ArrowRight, Camera, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { notify } from '../../components/ui/CustomToast'
import AnimatedLogo from './AnimatedLogo'
import './Auth.css'

const INDUSTRIES = ['Manufacturing', 'Retail', 'Distribution', 'Services', 'Pharma', 'Food & Beverage', 'Other']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', company: '', industry: '', password: '', confirm: '', photo: null })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const photoInputRef = useRef(null)

  const update = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { notify.error('Selected photo exceeds the 2 MB limit.', 'File Too Large'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setForm(p => ({ ...p, photo: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const removePhoto = (e) => {
    e.stopPropagation()
    setForm(p => ({ ...p, photo: null }))
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const nextStep = (e) => {
    e.preventDefault()
    if (!form.name || !form.email) { notify.error('Please fill in both your full name and work email address.', 'Info Required'); return }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.company || !form.industry) { notify.error('Please select your company name and industry category.', 'Details Missing'); return }
    if (form.password.length < 8) { notify.error('Password must be at least 8 characters long.', 'Password Too Short'); return }
    if (form.password !== form.confirm) { notify.error('The passwords you entered do not match.', 'Password Mismatch'); return }
    setLoading(true)
    try {
      const res = await register(form)
      notify.success(res?.message || 'Account created successfully! Please sign in.', 'Account Created 🎉')
      navigate('/login')
    } catch (err) {
      const errData = err.response?.data?.error
      const msg = errData?.details?.[0]?.message || errData?.message || err.message || 'Could not complete registration. Please try again.'
      notify.error(msg, 'Registration Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left__inner">

          {/* ── Crazy animated logo ── */}
          <AnimatedLogo />

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

              {/* ── Profile photo picker ── */}
              <div className="auth-avatar-picker">
                <div className="auth-avatar-wrap">
                  <div
                    className="auth-avatar-circle"
                    onClick={() => photoInputRef.current.click()}
                    title="Upload profile photo"
                  >
                    {form.photo ? (
                      <img src={form.photo} alt="Profile" className="auth-avatar-preview" />
                    ) : (
                      <span className="auth-avatar-initials">
                        {form.name ? form.name.slice(0, 2).toUpperCase() : '?'}
                      </span>
                    )}
                    <div className="auth-avatar-overlay">
                      <Camera size={18} strokeWidth={1.75} />
                      <span>{form.photo ? 'Change' : 'Add photo'}</span>
                    </div>
                  </div>

                  {/* Delete badge — only when photo is set */}
                  {form.photo && (
                    <button
                      type="button"
                      className="auth-avatar-delete"
                      onClick={removePhoto}
                      title="Remove photo"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  )}
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhoto}
                  id="reg-photo"
                />
              </div>

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
