import { createContext, useContext, useState, useCallback } from 'react';

const API_BASE = 'http://localhost:4000/api';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  function persistSession(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem('token', newToken);
    sessionStorage.setItem('user', JSON.stringify(newUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }

  async function register(email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.errors?.[0] || 'Registration failed.');
    persistSession(data.token, data.user);
  }

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.errors?.[0] || 'Login failed.');
    persistSession(data.token, data.user);
  }

  /**
   * Wrapper around fetch that attaches the auth token and applies the
   * NFR9 sliding-expiry refresh: every authenticated response carries a
   * fresh token in the X-Refreshed-Token header, which we store so the
   * session only times out after real inactivity.
   */
  const authFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      const refreshed = res.headers.get('X-Refreshed-Token');
      if (refreshed) {
        setToken(refreshed);
        sessionStorage.setItem('token', refreshed);
      }

      if (res.status === 401) {
        logout();
      }

      return res;
    },
    [token]
  );

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
