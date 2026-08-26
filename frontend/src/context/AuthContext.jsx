// src/context/AuthContext.jsx
// ============================================================
// Auth Context — wired to real backend REST API
// Session stored in HTTP-only cookie (withCredentials: true)
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on page load ─────────────────────────
  useEffect(() => {
    async function restoreSession() {
      // Try to fetch the current user from the backend cookie session
      try {
        const res = await api.get('/auth/me');
        const data = res.data?.data ?? res.data;
        if (data?.user || data?.id) {
          setUser(data.user ?? data);
        }
      } catch {
        // 401 = not logged in — that's fine
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // ── Login ─────────────────────────────────────────────────
  const login = async (email, password) => {
    const res  = await api.post('/auth/login', { email, password });
    const data = res.data?.data ?? res.data;
    const loggedInUser = data?.user ?? data;
    setUser(loggedInUser);
    return loggedInUser;
  };

  // ── Register ──────────────────────────────────────────────
  const register = async ({ name, email, password, company, industry }) => {
    const parts = (name || '').trim().split(' ');
    const firstName = parts[0] || 'User';
    const lastName = parts.slice(1).join(' ') || 'Account';

    const res = await api.post('/auth/signup', {
      firstName,
      lastName,
      email,
      password,
    });
    const data = res.data?.data ?? res.data;
    return data;
  };

  // ── Refresh User Session ──────────────────────────────────
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const data = res.data?.data ?? res.data;
      if (data?.user || data?.id) {
        setUser(data.user ?? data);
        return data.user ?? data;
      }
    } catch {
      // ignore
    }
    return null;
  };

  // ── Logout ────────────────────────────────────────────────
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore errors — clear local state regardless
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
