import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { authFetch, user } = useAuth();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [byCategory, setByCategory] = useState(null);
  const [byUser, setByUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role !== 'admin') {
    return <p>Reports are only available to administrator accounts.</p>;
  }

  async function loadReports() {
    setError('');
    setLoading(true);
    const query = new URLSearchParams();
    if (start) query.set('start', start);
    if (end) query.set('end', end);

    try {
      const [catRes, userRes] = await Promise.all([
        authFetch(`/reports/by-category?${query}`),
        authFetch(`/reports/by-user?${query}`),
      ]);
      const catData = await catRes.json();
      const userData = await userRes.json();

      if (!catRes.ok) throw new Error(catData.errors?.[0] || 'Could not load category report.');
      if (!userRes.ok) throw new Error(userData.errors?.[0] || 'Could not load user report.');

      setByCategory(catData.report);
      setByUser(userData.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h2>Usage reports (admin)</h2>

      <label>
        Start date <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label style={{ marginLeft: '1rem' }}>
        End date <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <button onClick={loadReports} disabled={loading} style={{ marginLeft: '1rem' }}>
        {loading ? 'Loading...' : 'Generate reports'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {byCategory && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>FR13 — Usage by category</h3>
          <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
            <thead><tr><th>Category</th><th>Count</th></tr></thead>
            <tbody>
              {byCategory.map((row) => (
                <tr key={row.category}><td>{row.category}</td><td>{row.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byUser && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>FR14 — Usage by user</h3>
          <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
            <thead><tr><th>User</th><th>Count</th></tr></thead>
            <tbody>
              {byUser.map((row) => (
                <tr key={row.email}><td>{row.email}</td><td>{row.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
