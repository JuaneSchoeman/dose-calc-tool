// src/api.js
// Thin fetch wrapper used by every page/component to talk to the backend.
// `credentials: 'include'` is required so the session cookie (auth) is sent
// on cross-origin requests to the API (backend on :3000, frontend on :5173).

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
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
