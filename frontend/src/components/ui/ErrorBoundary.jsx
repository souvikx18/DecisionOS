import React from 'react'
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // In production, send to error tracker (Sentry / LogRocket / Datadog)
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary caught error]:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
    window.location.href = '/login'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary, #0B0F17)',
          color: 'var(--text-primary, #F8FAFC)',
          padding: '24px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: 'var(--bg-surface, #131B2E)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
            borderRadius: '16px',
            padding: '36px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              color: '#EF4444'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '10px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94A3B8)', lineHeight: '1.6', marginBottom: '24px' }}>
              An unexpected client error occurred while rendering the workspace. Our telemetry team has been alerted.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre style={{
                textAlign: 'left',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#F87171',
                overflowX: 'auto',
                marginBottom: '20px',
                maxHeight: '140px'
              }}>
                {this.state.error.toString()}
              </pre>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563EB',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
                Reload Page
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary, #F8FAFC)',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                Return to Login
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
