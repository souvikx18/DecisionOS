import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import ErrorBoundary from './components/ui/ErrorBoundary'

// ── Lazy-Loaded Pages for Production Chunk Splitting ─────────
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Auth/Login'))
const Register = lazy(() => import('./pages/Auth/Register'))
const AcceptInvitation = lazy(() => import('./pages/Auth/AcceptInvitation'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DataImport = lazy(() => import('./pages/DataImport'))
const AIInsights = lazy(() => import('./pages/AIInsights'))
const Reports = lazy(() => import('./pages/Reports'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Sales = lazy(() => import('./pages/Sales'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Customers = lazy(() => import('./pages/Customers'))
const Billing = lazy(() => import('./pages/Billing'))
const Settings = lazy(() => import('./pages/Settings'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: 'var(--text-secondary, #94A3B8)'
    }}>
      <Loader2 size={28} className="animate-spin text-blue-500" />
      <span style={{ fontSize: '13px', fontWeight: '500' }}>Loading workspace...</span>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/invite/accept" element={<AcceptInvitation />} />
                  <Route path="/accept-invitation" element={<AcceptInvitation />} />

                  {/* Protected app routes */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/import" element={<DataImport />} />
                    <Route path="/insights" element={<AIInsights />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>

              <Toaster
                position="top-center"
                containerStyle={{
                  top: 24,
                  left: 20,
                  right: 20,
                  bottom: 24,
                }}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'transparent',
                    boxShadow: 'none',
                    padding: 0,
                    border: 'none',
                    maxWidth: '100%',
                  },
                }}
              />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
