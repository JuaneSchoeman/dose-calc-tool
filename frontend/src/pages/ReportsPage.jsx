// src/pages/ReportsPage.jsx
// FR13: usage report by category per time period
// FR14: usage report by user per time period
// Plus: a filterable detailed report scoped to a specific user, department
// (clinical category), and/or calculation type - each independently
// printable.

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

// Sets a data attribute on <body> so print CSS can show only the section
// being printed, then triggers the browser print dialog, then clears it.
function printSection(target) {
  document.body.dataset.printTarget = target;
  const reset = () => {
    delete document.body.dataset.printTarget;
    window.removeEventListener('afterprint', reset);
  };
  window.addEventListener('afterprint', reset);
  window.print();
}

export default function ReportsPage() {
  const [{ from, to }, setRange] = useState(defaultDateRange);
  const [byCategory, setByCategory] = useState([]);
  const [byUser, setByUser] = useState([]);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  const [filterUser, setFilterUser] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCalcType, setFilterCalcType] = useState('');
  const [detailedRows, setDetailedRows] = useState(null);
  const [detailedError, setDetailedError] = useState('');

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
    apiFetch('/calc/categories').then(({ categories: cats }) => setCategories(cats)).catch(() => {});
    apiFetch('/reports/users').then(({ users: list }) => setUsers(list)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    generateReports(from, to);
  }

  async function generateDetailedReport(e) {
    e.preventDefault();
    setDetailedError('');
    try {
      const params = new URLSearchParams({ from, to });
      if (filterUser) params.set('identifierNumber', filterUser);
      if (filterCategory) params.set('category', filterCategory);
      if (filterCalcType) params.set('calcType', filterCalcType);

      const res = await apiFetch(`/reports/detailed?${params.toString()}`);
      setDetailedRows(res.report);
    } catch (err) {
      setDetailedError(err.message);
      setDetailedRows(null);
    }
  }

  const detailedFilterSummary = [
    filterUser && `User: ${filterUser}`,
    filterCategory && `Department: ${filterCategory}`,
    filterCalcType && `Type: ${filterCalcType === 'bsa' ? 'BSA-based' : 'Weight-based'}`,
  ]
    .filter(Boolean)
    .join(' | ') || 'All users, all departments, all calculation types';

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
          by user, for a selected date range. Each report below can be printed on its own.
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
          <button type="button" className="secondary" onClick={() => printSection('all')}>
            Print all reports
          </button>
        </div>
      </div>

      <div className="report-grid">
        <div className="card print-only-category">
          <h2>By clinical department</h2>
          <div className="btn-row no-print" style={{ marginBottom: 8 }}>
            <button type="button" className="secondary" onClick={() => printSection('category')}>
              Print this report
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Department (category)</th>
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

        <div className="card print-only-user">
          <h2>By user</h2>
          <div className="btn-row no-print" style={{ marginBottom: 8 }}>
            <button type="button" className="secondary" onClick={() => printSection('user')}>
              Print this report
            </button>
          </div>
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

      <div className="card no-print">
        <h2>Detailed report</h2>
        <p className="subtitle">
          Build a specific report for one user, one department, one calculation type - or any
          combination - and print just that.
        </p>

        {detailedError && <div className="alert alert-error" role="alert">{detailedError}</div>}

        <form className="filter-row" onSubmit={generateDetailedReport}>
          <div className="field-group">
            <label htmlFor="filterUser">User</label>
            <select id="filterUser" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="filterCategory">Department</label>
            <select
              id="filterCategory"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All departments</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="filterCalcType">Calculation type</label>
            <select
              id="filterCalcType"
              value={filterCalcType}
              onChange={(e) => setFilterCalcType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="weight">Weight-based</option>
              <option value="bsa">BSA-based</option>
            </select>
          </div>

          <button type="submit">Generate detailed report</button>
        </form>

        {detailedRows && (
          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button type="button" className="secondary" onClick={() => printSection('detailed')}>
              Print this report
            </button>
          </div>
        )}
      </div>

      {detailedRows && (
        <div className="card print-only-detailed">
          <h2>Detailed calculation report</h2>
          <p className="help-text" style={{ marginBottom: 12 }}>
            Filters applied: {detailedFilterSummary}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date/time</th>
                  <th>Identifying number</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Weight (kg)</th>
                  <th>Height (cm)</th>
                  <th>BSA (m2)</th>
                  <th>Prescribed rate</th>
                  <th>Total dose</th>
                </tr>
              </thead>
              <tbody>
                {detailedRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="help-text">
                      No calculations match these filters in this period.
                    </td>
                  </tr>
                )}
                {detailedRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.created_at}</td>
                    <td>{r.identifier_number}</td>
                    <td>{r.category}</td>
                    <td>{r.calc_type === 'bsa' ? 'BSA-based' : 'Weight-based'}</td>
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
        </div>
      )}
    </main>
  );
}
