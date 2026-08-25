// src/pages/Auth/AcceptInvitation.jsx
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Users, Building2, Shield, ArrowRight, Loader2 } from 'lucide-react'
import api from '../../lib/api.js'
import { notify } from '../../components/ui/CustomToast.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import './AcceptInvitation.css'

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  // Registration fields if user needs account
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!token) {
      setError('Invitation token is missing from the URL.')
      setLoading(false)
      return
    }

    const fetchPreview = async () => {
      try {
        const res = await api.get(`/invitations/accept?token=${encodeURIComponent(token)}`)
        setPreview(res.data?.data ?? res.data)
      } catch (err) {
        setError(err.response?.data?.error?.message || 'This invitation is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [token])

  const handleAccept = async (e) => {
    e.preventDefault()

    // If new account is needed
    if (!user) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        notify.error('Please enter your first and last name.', 'Name Required')
        return
      }
      if (form.password.length < 8) {
        notify.error('Password must be at least 8 characters with upper, lower, number, and symbol.', 'Password Too Short')
        return
      }
      if (form.password !== form.confirmPassword) {
        notify.error('The passwords do not match.', 'Password Mismatch')
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        token,
        ...(!user ? {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          password: form.password,
        } : {})
      }

      const res = await api.post('/invitations/accept', payload)
      notify.success(res.data?.message || `Joined ${preview?.organization?.name || 'organization'} successfully!`, 'Welcome! 🎉')
      
      if (refreshUser) await refreshUser()
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to accept invitation. Please try again.'
      notify.error(msg, 'Invitation Error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="invite-page">
        <div className="glass-card invite-card invite-loading">
          <Loader2 size={32} className="invite-spin" />
          <p>Verifying invitation link…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="invite-page">
        <div className="glass-card invite-card invite-error-card">
          <div className="invite-error-icon">
            <AlertCircle size={32} />
          </div>
          <h2>Invitation Invalid</h2>
          <p>{error}</p>
          <div className="invite-actions">
            <Link to="/login" className="btn-primary">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="invite-page">
      <div className="glass-card invite-card">
        {/* Header Badge */}
        <div className="invite-header-badge">
          <Building2 size={20} />
        </div>

        <h1 className="invite-title">You're Invited!</h1>
        <p className="invite-sub">
          <strong>{preview?.invitedBy?.name || 'A team member'}</strong> has invited you to join{' '}
          <span className="invite-org-name">{preview?.organization?.name || 'the team'}</span> as an{' '}
          <span className="badge badge-primary">{preview?.role || 'MEMBER'}</span>.
        </p>

        <div className="invite-info-pill">
          <Users size={15} />
          <span>Email: <strong>{preview?.email}</strong></span>
        </div>

        {/* Acceptance Form */}
        <form onSubmit={handleAccept} className="invite-form">
          {!user && (
            <>
              <div className="invite-form-row">
                <div className="invite-field">
                  <label htmlFor="inv-first">First Name</label>
                  <input
                    id="inv-first"
                    type="text"
                    className="input-field"
                    placeholder="Jane"
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="invite-field">
                  <label htmlFor="inv-last">Last Name</label>
                  <input
                    id="inv-last"
                    type="text"
                    className="input-field"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="invite-field">
                <label htmlFor="inv-pass">Create Password</label>
                <input
                  id="inv-pass"
                  type="password"
                  className="input-field"
                  placeholder="Min. 8 characters with symbol"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>

              <div className="invite-field">
                <label htmlFor="inv-confirm">Confirm Password</label>
                <input
                  id="inv-confirm"
                  type="password"
                  className="input-field"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            </>
          )}

          {user && (
            <div className="invite-logged-in-msg">
              <CheckCircle2 size={16} style={{ color: '#10B981' }} />
              <span>
                You are currently signed in as <strong>{user.email}</strong>.
              </span>
            </div>
          )}

          <button type="submit" className="btn-primary invite-submit-btn" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} className="invite-spin" /> Joining…
              </>
            ) : (
              <>
                Accept & Join Workspace <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="invite-footer">
          <span>Already have an account?</span> <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
