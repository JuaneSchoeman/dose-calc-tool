import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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

  if (loading) return <p>Loading history...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h2>My calculation history</h2>
      {history.length === 0 ? (
        <p>No calculations yet.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Date/time</th>
              <th>Category</th>
              <th>Type</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td>{row.createdAt}</td>
                <td>{row.category}</td>
                <td>{row.calcType}</td>
                <td>{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
