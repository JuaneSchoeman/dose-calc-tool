// src/pages/HistoryPage.jsx
// FR12: view personal calculation history
// NFR13: clearly labelled, sortable tabular format

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';

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

const COLUMNS = [
  { key: 'created_at', label: 'Date/time' },
  { key: 'category', label: 'Category' },
  { key: 'calc_type', label: 'Type' },
  { key: 'drug_name', label: 'Drug' },
  { key: 'weight_kg', label: 'Weight (kg)' },
  { key: 'height_cm', label: 'Height (cm)' },
  { key: 'bsa_m2', label: 'BSA (m²)' },
  { key: 'dose_per_unit', label: 'Prescribed rate' },
  { key: 'total_dose', label: 'Total dose' },
];

export default function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    apiFetch('/calc/history')
      .then(({ history }) => setRows(history))
      .catch((err) => setError(err.message));
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <main className="page-container wide">
      <div className="card">
        <h1>My calculation history</h1>
        <p className="subtitle">
          A read-only, tamper-proof record of your own past calculations. Click a column heading to sort.
        </p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {rows.length === 0 && !error && (
          <p className="help-text">No calculations yet.</p>
        )}

        {rows.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} onClick={() => handleSort(col.key)}>
                      {col.label}
                      <span className="sort-indicator">
                        {sortKey === col.key ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatLocalTime(r.created_at)}</td>
                    <td>{r.category}</td>
                    <td>{r.calc_type === 'bsa' ? 'BSA-based' : 'Weight-based'}</td>
                    <td>{r.drug_name || '-'}</td>
                    <td>{r.weight_kg ?? '-'}</td>
                    <td>{r.height_cm ?? '-'}</td>
                    <td>{r.bsa_m2 ?? '-'}</td>
                    <td>
                      {r.dose_per_unit} {r.dose_rate_label || ''}
                    </td>
                    <td>
                      {r.total_dose} {r.dose_unit || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
