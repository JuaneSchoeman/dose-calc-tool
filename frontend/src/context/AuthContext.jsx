// src/context/AuthContext.jsx
// Holds the current session (logged-in user) and exposes login/register/
// logout actions. FR1 (register), FR2 (login/logout).

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const { user: sessionUser } = await apiFetch('/auth/me');
      setUser(sessionUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (identifierNumber, password) => {
    const { user: loggedInUser } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifierNumber, password }),
    });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (identifierNumber, password, confirmPassword, email) => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ identifierNumber, password, confirmPassword, email: email || undefined }),
    });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = { user, loading, login, register, logout, refreshSession };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
