import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import AcceptInvitation from './pages/Auth/AcceptInvitation'
import Dashboard from './pages/Dashboard'
import DataImport from './pages/DataImport'
import AIInsights from './pages/AIInsights'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Sales from './pages/Sales'
import Expenses from './pages/Expenses'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Billing from './pages/Billing'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
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
  )
}
