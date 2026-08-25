// src/pages/LoginPage.jsx
// FR2: login by professional identifying number (SANC/SAPC style) + password.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifierNumber, setIdentifierNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifierNumber.trim(), password);
      navigate('/calculator');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-container">
      <div className="card">
        <h1>Log in</h1>
        <p className="subtitle">Access the weight- and BSA-based dose calculator.</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="identifierNumber">
              Identifying number <span className="required-tag">*</span>
            </label>
            <input
              type="text"
              id="identifierNumber"
              autoComplete="username"
              required
              value={identifierNumber}
              onChange={(e) => setIdentifierNumber(e.target.value)}
            />
            <p className="help-text">Your professional registration number (e.g. SANC or SAPC number).</p>
          </div>

          <div className="field-group">
            <label htmlFor="password">
              Password <span className="required-tag">*</span>
            </label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="btn-row">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </div>
        </form>

        <p className="help-text" style={{ marginTop: 16 }}>
          Don&apos;t have an account? <Link to="/register">Register here</Link>.
        </p>
      </div>
    </main>
  );
}
