import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Mock user data for frontend-first development
const MOCK_USER = {
  id: 1,
  name: 'Arjun Mehta',
  email: 'arjun@acmecorp.com',
  role: 'admin',
  company: { id: 1, name: 'Acme Corp', industry: 'Manufacturing', plan: 'pro' },
  avatar: 'AM',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for existing session
    const stored = localStorage.getItem('dos_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = (email, _password) => {
    // Mock login — replace with real API call in Phase 2
    const mockUser = { ...MOCK_USER, email }
    setUser(mockUser)
    localStorage.setItem('dos_user', JSON.stringify(mockUser))
    return Promise.resolve(mockUser)
  }

  const register = (data) => {
    const mockUser = {
      ...MOCK_USER,
      name: data.name,
      email: data.email,
      company: { ...MOCK_USER.company, name: data.company },
      avatar: data.name.slice(0, 2).toUpperCase(),
      photo: data.photo || null,
    }
    setUser(mockUser)
    localStorage.setItem('dos_user', JSON.stringify(mockUser))
    return Promise.resolve(mockUser)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('dos_user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
