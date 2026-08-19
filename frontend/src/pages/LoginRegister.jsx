import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginRegister() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>Dose Calculator</h1>
          <p>Weight- and BSA-based dosing, calculated and shown step by step.</p>
        </div>

        <div className="auth-mode-switch" role="tablist">
          <button role="tab" aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>
            Log in
          </button>
          <button role="tab" aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>
            Register
          </button>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.org"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={mode === 'register' ? 8 : undefined}
              />
              {mode === 'register' && <span className="field-hint">Minimum 8 characters.</span>}
            </label>

            {error && (
              <div className="alert alert-error" role="alert">
                <p>{error}</p>
              </div>
            )}

            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
