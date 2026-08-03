import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard'
import DataImport from './pages/DataImport'
import AIInsights from './pages/AIInsights'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected app routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/import"        element={<DataImport />} />
            <Route path="/insights"      element={<AIInsights />} />
            <Route path="/reports"       element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#0F172A',
              fontSize: '13.5px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              border: '1px solid #DDE3EA',
              borderRadius: '10px',
              boxShadow: '0 4px 24px rgba(15,23,42,0.08)',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#fff' },
            },
          }}
        />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
