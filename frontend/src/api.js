// src/api.js
// Thin fetch wrapper used by every page/component to talk to the backend.
// `credentials: 'include'` is required so the session cookie (auth) is sent
// on cross-origin requests to the API.
//
// API_BASE defaults to '' (same origin) so that in production, where
// server.js serves this built frontend alongside the API under /api, a
// single deployed URL handles everything with no CORS involved at all.
// For local development with two separate dev servers (Vite on :5173,
// Express on :3000), set VITE_API_URL in frontend/.env.local - see
// frontend/.env.example.
const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body (e.g. 204)
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status}).`;
    throw new Error(message);
  }
  return data;
}
