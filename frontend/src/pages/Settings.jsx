// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../lib/api.js'
import {
  User, Building2, Bell, Shield, Palette, Save, CheckCircle,
  AlertCircle, Users, UserPlus, Trash2, Mail, Copy, Check,
  LogOut, Loader2, ShieldCheck, ShieldAlert, Globe, DollarSign
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'
import { notify } from '../components/ui/CustomToast.jsx'
import './Settings.css'

const TABS = [
  { id: 'profile',       icon: User,      label: 'Profile' },
  { id: 'organization',  icon: Building2, label: 'Organization' },
  { id: 'team',          icon: Users,      label: 'Team Members' },
  { id: 'notifications', icon: Bell,      label: 'Notifications' },
  { id: 'appearance',    icon: Palette,   label: 'Appearance' },
  { id: 'security',      icon: Shield,    label: 'Security' },
]

const ROLES = [
  { id: 'ADMIN',   label: 'Admin',   desc: 'Can manage members, data, and settings' },
  { id: 'ANALYST', label: 'Analyst', desc: 'Can view data, generate reports and AI scans' },
  { id: 'VIEWER',  label: 'Viewer',  desc: 'Read-only access to dashboards and insights' },
]

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR ₹)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD $)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR €)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP £)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (SGD S$)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (CAD C$)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (AUD A$)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (JPY ¥)' },
]

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST — UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time — UTC+00:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT — UTC-05:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT — UTC-06:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT — UTC-08:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST — UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST — UTC+01:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST — UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT — UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST — UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT — UTC+10:00)' },
]

const INDUSTRIES = [
  'Manufacturing',
  'Retail & E-commerce',
  'Distribution & Logistics',
  'SaaS & Technology',
  'Services & Consulting',
  'Pharmaceuticals & Healthcare',
  'Food & Beverage',
  'Finance & Banking',
  'Other',
]

export default function Settings() {
  const { user, logout, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')

  // Profile form state
  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    email:     user?.email     ?? '',
  })
  const [profileSaving, setProfileSaving] = useState(false)

  // Organization form state
  const [orgForm, setOrgForm] = useState({
    name: user?.org?.name ?? '',
    industry: user?.org?.industry ?? 'Manufacturing',
    currency: user?.org?.currency ?? 'INR',
    timezone: user?.org?.timezone ?? 'Asia/Kolkata',
  })
  const [orgSaving, setOrgSaving] = useState(false)

  useEffect(() => {
    if (user?.org) {
      setOrgForm({
        name: user.org.name ?? '',
        industry: user.org.industry ?? 'Manufacturing',
        currency: user.org.currency ?? 'INR',
        timezone: user.org.timezone ?? 'Asia/Kolkata',
      })
    }
  }, [user])

  // Password state
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    emailAlerts: true,
    lowStockAlerts: true,
    revenueAlerts: true,
    aiInsightDigest: true,
    reportReady: true,
  })

  // Team & Member State
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'ANALYST' })
  const [inviting, setInviting] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [roleUpdating, setRoleUpdating] = useState({})
  const [removingMember, setRemovingMember] = useState({})
  const [cancelingInvite, setCancelingInvite] = useState({})

  const fetchTeamData = async () => {
    setTeamLoading(true)
    try {
      const [mRes, iRes] = await Promise.all([
        api.get('/members').catch(() => ({ data: { data: { members: [] } } })),
        api.get('/invitations').catch(() => ({ data: { data: { invitations: [] } } })),
      ])
      const mList = mRes.data?.data?.members ?? mRes.data?.members ?? []
      const iList = iRes.data?.data?.invitations ?? iRes.data?.invitations ?? []
      setMembers(mList)
      setInvitations(iList)
    } catch {
      // Ignored
    } finally {
      setTeamLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamData()
    }
  }, [activeTab])

  const saveProfile = async (e) => {
    e.preventDefault()
    if (!profile.firstName) { notify.error('First name is required.'); return }
    setProfileSaving(true)
    try {
      await api.patch('/users/me', { firstName: profile.firstName, lastName: profile.lastName })
      notify.success('Profile updated successfully.', 'Saved ✓')
      if (refreshUser) await refreshUser()
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to update profile.', 'Error')
    } finally {
      setProfileSaving(false)
    }
  }

  const saveOrg = async (e) => {
    e.preventDefault()
    if (!orgForm.name.trim() || orgForm.name.trim().length < 2) {
      notify.error('Organization name must be at least 2 characters.', 'Invalid Name')
      return
    }
    setOrgSaving(true)
    try {
      await api.patch('/organizations/me', {
        name: orgForm.name.trim(),
        industry: orgForm.industry,
        currency: orgForm.currency,
        timezone: orgForm.timezone,
      })
      notify.success('Organization profile updated.', 'Settings Saved ✓')
      if (refreshUser) await refreshUser()
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to update organization.', 'Error')
    } finally {
      setOrgSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (passwords.newPassword.length < 8) { notify.error('New password must be at least 8 characters.'); return }
    if (passwords.newPassword !== passwords.confirm) { notify.error('Passwords do not match.'); return }
    setPwSaving(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      notify.success('Password changed. Please sign in again.', 'Password Updated')
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to change password.', 'Error')
    } finally {
      setPwSaving(false)
    }
  }

  // ── Team Member Actions ──────────────────────────────────────────
  const handleSendInvite = async (e) => {
    e.preventDefault()
    if (!inviteForm.email.trim()) {
      notify.error('Please enter a valid email address.', 'Missing Email')
      return
    }
    setInviting(true)
    try {
      const res = await api.post('/invitations', inviteForm)
      notify.success(res.data?.message || `Invitation sent to ${inviteForm.email}.`, 'Invited ✉️')
      setInviteForm({ email: '', role: 'ANALYST' })
      fetchTeamData()
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to send invitation.', 'Error')
    } finally {
      setInviting(false)
    }
  }

  const handleChangeRole = async (memberId, newRole) => {
    setRoleUpdating((p) => ({ ...p, [memberId]: true }))
    try {
      await api.patch(`/members/${memberId}/role`, { role: newRole })
      notify.success(`Role updated to ${newRole}.`, 'Role Changed')
      fetchTeamData()
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to change role.', 'Error')
    } finally {
      setRoleUpdating((p) => ({ ...p, [memberId]: false }))
    }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || 'this member'} from the organization?`)) return
    setRemovingMember((p) => ({ ...p, [memberId]: true }))
    try {
      await api.delete(`/members/${memberId}`)
      notify.success('Member removed successfully.', 'Removed')
      fetchTeamData()
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to remove member.', 'Error')
    } finally {
      setRemovingMember((p) => ({ ...p, [memberId]: false }))
    }
  }

  const handleCancelInvite = async (inviteId) => {
    setCancelingInvite((p) => ({ ...p, [inviteId]: true }))
    try {
      await api.delete(`/invitations/${inviteId}`)
      notify.success('Invitation revoked.', 'Cancelled')
      fetchTeamData()
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to cancel invitation.', 'Error')
    } finally {
      setCancelingInvite((p) => ({ ...p, [inviteId]: false }))
    }
  }

  const copyInviteLink = (token, inviteId) => {
    const url = `${window.location.origin}/invite/accept?token=${encodeURIComponent(token)}`
    navigator.clipboard.writeText(url)
    setCopiedId(inviteId)
    notify.success('Invitation link copied to clipboard.', 'Link Copied 📋')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleLeaveOrg = async () => {
    if (!window.confirm('Are you sure you want to leave this organization?')) return
    try {
      await api.delete('/members/me/leave')
      notify.success('You have left the organization.', 'Left Workspace')
      logout()
    } catch (err) {
      notify.error(err.response?.data?.error?.message || 'Failed to leave organization.', 'Error')
    }
  }

  const isOrgManager = user?.role === 'OWNER' || user?.role === 'ADMIN'

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Settings</h1>
        <p className="settings-page__sub">Manage your account, organization profile, team members, and preferences.</p>
      </div>

      <div className="settings-layout">
        {/* Sidebar tabs */}
        <div className="glass-card settings-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`settings-tab ${activeTab === t.id ? 'settings-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              id={`settings-tab-${t.id}`}
            >
              <t.icon size={16} strokeWidth={1.75} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="settings-content">

          {/* ── Profile ── */}
          {activeTab === 'profile' && (
            <div className="glass-card settings-panel">
              <h2 className="settings-panel__title">Personal Information</h2>
              <p className="settings-panel__sub">Update your name and email address.</p>
              <form className="settings-form" onSubmit={saveProfile}>
                <div className="settings-form-row">
                  <div className="settings-field">
                    <label htmlFor="s-firstname">First Name</label>
                    <input id="s-firstname" type="text" className="input-field" value={profile.firstName}
                      onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
                  </div>
                  <div className="settings-field">
                    <label htmlFor="s-lastname">Last Name</label>
                    <input id="s-lastname" type="text" className="input-field" value={profile.lastName}
                      onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
                  </div>
                </div>
                <div className="settings-field">
                  <label htmlFor="s-email">Email Address</label>
                  <input id="s-email" type="email" className="input-field" value={profile.email} disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  <span className="settings-field__hint">Email cannot be changed. Contact support if needed.</span>
                </div>
                <div className="settings-form-actions">
                  <button type="submit" className="btn-primary" disabled={profileSaving} id="save-profile-btn">
                    {profileSaving ? 'Saving…' : <><Save size={14} /> Save Changes</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Organization Settings (Editable) ── */}
          {activeTab === 'organization' && (
            <div className="glass-card settings-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h2 className="settings-panel__title">Organization Profile</h2>
                {isOrgManager ? (
                  <span className="badge badge-primary">
                    <ShieldCheck size={12} style={{ marginRight: 4 }} /> {user?.role} Access
                  </span>
                ) : (
                  <span className="badge badge-info">View Only</span>
                )}
              </div>
              <p className="settings-panel__sub">Configure your company name, industry sector, base currency, and operating timezone.</p>

              <form className="settings-form" onSubmit={saveOrg}>
                <div className="settings-form-row">
                  <div className="settings-field">
                    <label htmlFor="s-org-name">Organization / Company Name</label>
                    <input
                      id="s-org-name"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Acme Corporation"
                      value={orgForm.name}
                      disabled={!isOrgManager || orgSaving}
                      onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="settings-field">
                    <label htmlFor="s-org-industry">Industry Sector</label>
                    <select
                      id="s-org-industry"
                      className="team-role-select"
                      style={{ padding: '10px 14px', borderRadius: 8 }}
                      value={orgForm.industry}
                      disabled={!isOrgManager || orgSaving}
                      onChange={(e) => setOrgForm((p) => ({ ...p, industry: e.target.value }))}
                    >
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-field">
                    <label htmlFor="s-org-currency">
                      <DollarSign size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                      Base Reporting Currency
                    </label>
                    <select
                      id="s-org-currency"
                      className="team-role-select"
                      style={{ padding: '10px 14px', borderRadius: 8 }}
                      value={orgForm.currency}
                      disabled={!isOrgManager || orgSaving}
                      onChange={(e) => setOrgForm((p) => ({ ...p, currency: e.target.value }))}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <span className="settings-field__hint">Used across sales ledgers, expense charts, and financial KPIs.</span>
                  </div>

                  <div className="settings-field">
                    <label htmlFor="s-org-timezone">
                      <Globe size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                      Operating Timezone
                    </label>
                    <select
                      id="s-org-timezone"
                      className="team-role-select"
                      style={{ padding: '10px 14px', borderRadius: 8 }}
                      value={orgForm.timezone}
                      disabled={!isOrgManager || orgSaving}
                      onChange={(e) => setOrgForm((p) => ({ ...p, timezone: e.target.value }))}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <span className="settings-field__hint">Used for automated report cron triggers and anomaly timestamps.</span>
                  </div>
                </div>

                {/* Metadata Overview summary */}
                <div className="settings-info-grid" style={{ marginTop: 8 }}>
                  {[
                    { label: 'Current Plan', value: 'Starter (Free Tier)' },
                    { label: 'Workspace Status', value: 'Active & Verified' },
                    { label: 'Data Retention', value: '30 Days with automated purger' },
                  ].map((r) => (
                    <div key={r.label} className="settings-info-row">
                      <span className="settings-info-row__label">{r.label}</span>
                      <span className="settings-info-row__value">{r.value}</span>
                    </div>
                  ))}
                </div>

                {isOrgManager && (
                  <div className="settings-form-actions">
                    <button type="submit" className="btn-primary" disabled={orgSaving} id="save-org-btn">
                      {orgSaving ? (
                        <>
                          <Loader2 size={14} className="invite-spin" /> Saving Changes…
                        </>
                      ) : (
                        <>
                          <Save size={14} /> Save Organization Profile
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ── Team & Members ── */}
          {activeTab === 'team' && (
            <div className="glass-card settings-panel">
              <div className="team-header">
                <div>
                  <h2 className="settings-panel__title">Team Members</h2>
                  <p className="settings-panel__sub">Invite colleagues, assign roles, and manage permissions.</p>
                </div>
              </div>

              {/* Invite Form */}
              <div className="team-invite-card">
                <h3 className="team-invite-title">
                  <UserPlus size={16} /> Invite New Member
                </h3>
                <form onSubmit={handleSendInvite} className="team-invite-form">
                  <div className="team-invite-fields">
                    <input
                      type="email"
                      className="input-field team-invite-input"
                      placeholder="colleague@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                    <select
                      className="team-role-select"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                    >
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-primary team-invite-btn" disabled={inviting}>
                      {inviting ? <Loader2 size={14} className="invite-spin" /> : <><Mail size={14} /> Send Invite</>}
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Members */}
              <div className="team-section">
                <h3 className="team-section-title">
                  Active Members ({members.length})
                </h3>
                {teamLoading ? (
                  <div className="team-loading">Loading members…</div>
                ) : members.length === 0 ? (
                  <div className="team-empty">No members found.</div>
                ) : (
                  <div className="team-members-list">
                    {members.map((m) => {
                      const memberUser = m.user || {}
                      const initials = `${memberUser.firstName?.[0] || ''}${memberUser.lastName?.[0] || ''}` || memberUser.email?.[0]?.toUpperCase() || 'U'
                      const isOwner = m.role === 'OWNER'
                      const isSelf = memberUser.id === user?.id

                      return (
                        <div key={m.id} className="team-member-row">
                          <div className="team-member-info">
                            <div className="team-member-avatar">{initials}</div>
                            <div>
                              <div className="team-member-name">
                                {memberUser.firstName ? `${memberUser.firstName} ${memberUser.lastName || ''}`.trim() : memberUser.email}
                                {isSelf && <span className="badge badge-info" style={{ marginLeft: 6 }}>You</span>}
                              </div>
                              <div className="team-member-email">{memberUser.email}</div>
                            </div>
                          </div>

                          <div className="team-member-actions">
                            {isOwner ? (
                              <span className="badge badge-primary">
                                <ShieldCheck size={12} style={{ marginRight: 4 }} /> Owner
                              </span>
                            ) : (
                              <select
                                className="team-role-select"
                                value={m.role}
                                disabled={roleUpdating[m.id]}
                                onChange={(e) => handleChangeRole(m.id, e.target.value)}
                              >
                                {ROLES.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                            )}

                            {!isOwner && !isSelf && (
                              <button
                                className="team-action-btn team-action-btn--delete"
                                title="Remove member"
                                disabled={removingMember[m.id]}
                                onClick={() => handleRemoveMember(m.id, memberUser.firstName ? `${memberUser.firstName} ${memberUser.lastName || ''}` : memberUser.email)}
                              >
                                {removingMember[m.id] ? <Loader2 size={14} className="invite-spin" /> : <Trash2 size={14} />}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="team-section" style={{ marginTop: 28 }}>
                  <h3 className="team-section-title">
                    Pending Invitations ({invitations.length})
                  </h3>
                  <div className="team-invitations-list">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="team-member-row">
                        <div className="team-member-info">
                          <div className="team-member-avatar team-member-avatar--pending">
                            <Mail size={14} />
                          </div>
                          <div>
                            <div className="team-member-name">{inv.email}</div>
                            <div className="team-member-email">
                              Role: <strong>{inv.role}</strong> · Invited {new Date(inv.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="team-member-actions">
                          {inv.token && (
                            <button
                              className="team-action-btn"
                              title="Copy Invite Link"
                              onClick={() => copyInviteLink(inv.token, inv.id)}
                            >
                              {copiedId === inv.id ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                            </button>
                          )}
                          <button
                            className="team-action-btn team-action-btn--delete"
                            title="Revoke Invitation"
                            disabled={cancelingInvite[inv.id]}
                            onClick={() => handleCancelInvite(inv.id)}
                          >
                            {cancelingInvite[inv.id] ? <Loader2 size={14} className="invite-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leave Org Button (if not owner) */}
              {user?.role !== 'OWNER' && (
                <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
                  <button className="btn-ghost" style={{ color: '#EF4444' }} onClick={handleLeaveOrg}>
                    <LogOut size={14} /> Leave Organization
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="glass-card settings-panel">
              <h2 className="settings-panel__title">Notification Preferences</h2>
              <p className="settings-panel__sub">Control which alerts and emails you receive.</p>
              <div className="settings-toggles">
                {[
                  { key: 'emailAlerts',      label: 'Email Alerts',          sub: 'Receive important alerts via email' },
                  { key: 'lowStockAlerts',   label: 'Low Stock Warnings',     sub: 'Get notified when inventory reaches reorder level' },
                  { key: 'revenueAlerts',    label: 'Revenue Milestone Alerts', sub: 'Alerts when revenue targets are hit or missed' },
                  { key: 'aiInsightDigest',  label: 'AI Insight Digest',     sub: 'Weekly AI summary of your business performance' },
                  { key: 'reportReady',      label: 'Report Ready Emails',   sub: 'Email when scheduled reports are generated' },
                ].map((p) => (
                  <div key={p.key} className="settings-toggle-row">
                    <div>
                      <div className="settings-toggle-row__label">{p.label}</div>
                      <div className="settings-toggle-row__sub">{p.sub}</div>
                    </div>
                    <label className="settings-toggle" htmlFor={`toggle-${p.key}`}>
                      <input id={`toggle-${p.key}`} type="checkbox" checked={notifPrefs[p.key]}
                        onChange={(e) => setNotifPrefs((n) => ({ ...n, [p.key]: e.target.checked }))} />
                      <span className="settings-toggle__slider" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="settings-form-actions">
                <button className="btn-primary" onClick={() => notify.success('Notification preferences saved.', 'Saved ✓')} id="save-notif-btn">
                  <Save size={14} /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeTab === 'appearance' && (
            <div className="glass-card settings-panel">
              <h2 className="settings-panel__title">Appearance</h2>
              <p className="settings-panel__sub">Choose how DecisionOS looks on your device.</p>
              <div className="settings-theme-grid">
                {[
                  { id: 'light', label: 'Light', desc: 'Clean and bright', preview: '#F8FAFC' },
                  { id: 'dark',  label: 'Dark',  desc: 'Easy on the eyes', preview: '#0F172A' },
                  { id: 'auto',  label: 'System', desc: 'Match OS setting',  preview: 'linear-gradient(135deg, #F8FAFC 50%, #0F172A 50%)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    className={`settings-theme-card ${theme === t.id ? 'settings-theme-card--active' : ''}`}
                    onClick={() => { setTheme(t.id); notify.success(`Switched to ${t.label} theme.`, 'Theme Changed') }}
                    id={`theme-${t.id}`}
                  >
                    <div className="settings-theme-preview" style={{ background: t.preview }} />
                    <div className="settings-theme-label">{t.label}</div>
                    <div className="settings-theme-desc">{t.desc}</div>
                    {theme === t.id && <CheckCircle size={16} className="settings-theme-check" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div className="glass-card settings-panel">
              <h2 className="settings-panel__title">Security</h2>
              <p className="settings-panel__sub">Change your password and manage active sessions.</p>
              <form className="settings-form" onSubmit={changePassword}>
                <div className="settings-field">
                  <label htmlFor="s-curr-pass">Current Password</label>
                  <input id="s-curr-pass" type="password" className="input-field"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Enter your current password" />
                </div>
                <div className="settings-field">
                  <label htmlFor="s-new-pass">New Password</label>
                  <input id="s-new-pass" type="password" className="input-field"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Min. 8 characters with symbol" />
                </div>
                <div className="settings-field">
                  <label htmlFor="s-confirm-pass">Confirm New Password</label>
                  <input id="s-confirm-pass" type="password" className="input-field"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="Re-enter new password" />
                </div>
                <div className="settings-form-actions">
                  <button type="submit" className="btn-primary" disabled={pwSaving} id="change-password-btn">
                    {pwSaving ? 'Updating…' : <><Shield size={14} /> Change Password</>}
                  </button>
                </div>
              </form>

              <div className="settings-danger-zone">
                <div className="settings-danger-zone__header">
                  <AlertCircle size={16} style={{ color: '#EF4444' }} />
                  <span>Danger Zone</span>
                </div>
                <div className="settings-danger-row">
                  <div>
                    <div className="settings-danger-row__label">Sign out from all devices</div>
                    <div className="settings-danger-row__sub">This will invalidate all active sessions.</div>
                  </div>
                  <button className="btn-danger" id="logout-all-btn"
                    onClick={async () => {
                      try {
                        await api.post('/auth/logout-all')
                        notify.success('All sessions terminated.', 'Signed Out')
                        logout()
                      } catch {
                        notify.error('Failed to sign out all sessions.')
                      }
                    }}>
                    Sign Out All
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
