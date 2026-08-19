import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginRegister() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
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
    <div style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h1>Dose Calculator</h1>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setMode('login')} disabled={mode === 'login'}>
          Log in
        </button>
        <button onClick={() => setMode('register')} disabled={mode === 'register'} style={{ marginLeft: '0.5rem' }}>
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ display: 'block', width: '100%' }} />
        </label>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : undefined}
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        {mode === 'register' && <p style={{ fontSize: '0.85rem', color: '#555' }}>Minimum 8 characters.</p>}

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>
    </div>
  );
}
