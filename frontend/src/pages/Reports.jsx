import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function tagClass(category) {
  return `tag tag-${category.replace(/\//g, '\\/')}`;
}

export default function Reports() {
  const { authFetch, user } = useAuth();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [byCategory, setByCategory] = useState(null);
  const [byUser, setByUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <div className="card">
        <div className="empty-state">
          <p>Reports are only available to administrator accounts.</p>
        </div>
      </div>
    );
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
    <div className="card">
      <h2>Usage reports</h2>

      <div className="field-row" style={{ alignItems: 'flex-end' }}>
        <label className="field">
          <span className="field-label">Start date</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">End date</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      <div className="btn-row" style={{ marginTop: 0 }}>
        <button className="btn btn-primary" onClick={loadReports} disabled={loading}>
          {loading ? 'Generating…' : 'Generate reports'}
        </button>
      </div>

      {error && <div className="alert alert-error" role="alert"><p>{error}</p></div>}

      {byCategory && (
        <div style={{ marginTop: '1.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Usage by category</h3>
          {byCategory.length === 0 ? (
            <div className="empty-state"><p>No calculations recorded in this range.</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>Count</th></tr></thead>
              <tbody>
                {byCategory.map((row) => (
                  <tr key={row.category}>
                    <td><span className={tagClass(row.category)}>{row.category}</span></td>
                    <td className="num-cell">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {byUser && (
        <div style={{ marginTop: '1.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Usage by user</h3>
          {byUser.length === 0 ? (
            <div className="empty-state"><p>No calculations recorded in this range.</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>User</th><th style={{ textAlign: 'right' }}>Count</th></tr></thead>
              <tbody>
                {byUser.map((row) => (
                  <tr key={row.email}>
                    <td>{row.email}</td>
                    <td className="num-cell">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
