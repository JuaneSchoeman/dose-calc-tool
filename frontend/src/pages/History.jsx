import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Convert UTC timestamp string to local timezone with padded zeros
function formatLocalTime(utcTimestamp) {
  // Parse the UTC string (format: "2026-09-02 14:30:00")
  const date = new Date(utcTimestamp + 'Z');
  const pad = (n) => String(n).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

function tagClass(category) {
  return `tag tag-${category.replace(/\//g, '\\/')}`;
}

export default function History() {
  const { authFetch } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch('/history');
        const data = await res.json();
        if (!res.ok) throw new Error(data.errors?.[0] || 'Could not load history.');
        setHistory(data.history);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authFetch]);

  return (
    <div className="card">
      <h2>My calculation history</h2>

      {loading && <p style={{ color: 'var(--color-ink-muted)' }}>Loading…</p>}
      {error && (
        <div className="alert alert-error" role="alert"><p>{error}</p></div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">—</div>
          <p>No calculations yet. Results will appear here once you run one.</p>
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date &amp; time</th>
              <th>Category</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td className="num-cell" style={{ textAlign: 'left' }}>{formatLocalTime(row.createdAt)}</td>
                <td><span className={tagClass(row.category)}>{row.category}</span></td>
                <td>{row.calcType === 'weight-based' ? 'Weight-based' : 'BSA-based'}</td>
                <td className="num-cell">{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
