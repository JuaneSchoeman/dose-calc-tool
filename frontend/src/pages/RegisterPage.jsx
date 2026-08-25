// src/pages/RegisterPage.jsx
// FR1: register with a professional identifying number (SANC/SAPC style) as
// the login credential; email is optional.

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Alphanumeric, optionally with hyphens/slashes, 4-20 characters - loose
// enough to cover both SANC (numeric) and SAPC (alphanumeric) formats.
const IDENTIFIER_RE = /^[A-Za-z0-9/-]{4,20}$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [identifierNumber, setIdentifierNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  // Real-time validation (FR8-style), mirrored client-side for instant feedback.
  const identifierError = useMemo(() => {
    if (!touched.identifierNumber || !identifierNumber) return '';
    return IDENTIFIER_RE.test(identifierNumber.trim())
      ? ''
      : 'Must be 4-20 letters, digits, "-" or "/" (e.g. a SANC or SAPC number).';
  }, [identifierNumber, touched.identifierNumber]);

  const emailError = useMemo(() => {
    if (!touched.email || !email) return ''; // optional field - only validate if filled in
    return EMAIL_RE.test(email) ? '' : 'Please enter a valid email address, or leave it blank.';
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password || !password) return '';
    return password.length < 8 ? 'Password must be at least 8 characters.' : '';
  }, [password, touched.password]);

  const confirmError = useMemo(() => {
    if (!touched.confirmPassword || !confirmPassword) return '';
    return confirmPassword !== password ? 'Passwords do not match.' : '';
  }, [confirmPassword, password, touched.confirmPassword]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setTouched({ identifierNumber: true, email: true, password: true, confirmPassword: true });

    if (!IDENTIFIER_RE.test(identifierNumber.trim())) {
      return setError('Please enter a valid identifying number (4-20 letters, digits, "-" or "/").');
    }
    if (email && !EMAIL_RE.test(email)) {
      return setError('Please enter a valid email address, or leave it blank.');
    }
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      await register(identifierNumber.trim(), password, confirmPassword, email.trim() || undefined);
      setSuccess('Account created. Redirecting to log in...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-container">
      <div className="card">
        <h1>Create your account</h1>
        <p className="subtitle">
          Registered accounts store only your professional identifying number and a securely
          hashed password - no patient data is ever collected.
        </p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}

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
              onBlur={() => setTouched((t) => ({ ...t, identifierNumber: true }))}
            />
            <p className="help-text">Your professional registration number (e.g. SANC or SAPC number).</p>
            <p className="field-error">{identifierError}</p>
          </div>

          <div className="field-group">
            <label htmlFor="email">
              Email <span className="optional-tag">(optional)</span>
            </label>
            <input
              type="email"
              id="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            />
            <p className="field-error">{emailError}</p>
          </div>

          <div className="field-group">
            <label htmlFor="password">
              Password <span className="required-tag">*</span>
            </label>
            <input
              type="password"
              id="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            />
            <p className="help-text">At least 8 characters.</p>
            <p className="field-error">{passwordError}</p>
          </div>

          <div className="field-group">
            <label htmlFor="confirmPassword">
              Confirm password <span className="required-tag">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
            />
            <p className="field-error">{confirmError}</p>
          </div>

          <div className="btn-row">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>

        <p className="help-text" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Log in</Link>.
        </p>
      </div>
    </main>
  );
}
