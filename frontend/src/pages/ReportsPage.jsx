// src/pages/ReportsPage.jsx
// FR13: usage report by category per time period
// FR14: usage report by user per time period

import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  return {
    to: to.toISOString().slice(0, 10),
    from: from.toISOString().slice(0, 10),
  };
}

export default function ReportsPage() {
  const [{ from, to }, setRange] = useState(defaultDateRange);
  const [byCategory, setByCategory] = useState([]);
  const [byUser, setByUser] = useState([]);
  const [error, setError] = useState('');

  async function generateReports(fromDate, toDate) {
    setError('');
    try {
      const [catRes, userRes] = await Promise.all([
        apiFetch(`/reports/by-category?from=${fromDate}&to=${toDate}`),
        apiFetch(`/reports/by-user?from=${fromDate}&to=${toDate}`),
      ]);
      setByCategory(catRes.report);
      setByUser(userRes.report);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    generateReports(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    generateReports(from, to);
  }

  return (
    <main className="page-container wide">
      <div className="print-header">
        <h1>Dose Calculator - Usage Report</h1>
        <p className="print-meta">
          Period: {from} to {to} &nbsp;|&nbsp; Generated: {new Date().toLocaleString()}
        </p>
      </div>

      <div className="card no-print">
        <h1>Usage reports</h1>
        <p className="subtitle">
          Administrator view: number of calculations performed, grouped by clinical category and
          by user, for a selected date range.
        </p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form className="filter-row" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="from">
              From <span className="required-tag">*</span>
            </label>
            <input
              type="date"
              id="from"
              required
              value={from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </div>
          <div className="field-group">
            <label htmlFor="to">
              To <span className="required-tag">*</span>
            </label>
            <input
              type="date"
              id="to"
              required
              value={to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
          <button type="submit">Generate reports</button>
        </form>

        <div className="btn-row">
          <button type="button" className="secondary" onClick={() => window.print()}>
            Print report
          </button>
        </div>
      </div>

      <div className="report-grid">
        <div className="card">
          <h2>By clinical category</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Calculations</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.length === 0 && (
                  <tr>
                    <td colSpan={2} className="help-text">
                      No calculations in this period.
                    </td>
                  </tr>
                )}
                {byCategory.map((r) => (
                  <tr key={r.category}>
                    <td>{r.category}</td>
                    <td>{r.calculation_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>By user</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Identifying number</th>
                  <th>Calculations</th>
                </tr>
              </thead>
              <tbody>
                {byUser.length === 0 && (
                  <tr>
                    <td colSpan={2} className="help-text">
                      No calculations in this period.
                    </td>
                  </tr>
                )}
                {byUser.map((r) => (
                  <tr key={r.user_identifier}>
                    <td>{r.user_identifier}</td>
                    <td>{r.calculation_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
