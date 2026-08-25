// src/pages/ConverterPage.jsx
// Standalone mass-unit converter (mcg/mg/g/kg/lb), independent of any
// patient calculation. Addresses the mcg/mg unit-confusion error type
// identified in the literature review (Section 3.3).

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api';

export default function ConverterPage() {
  const [units, setUnits] = useState([]);
  const [value, setValue] = useState('');
  const [fromUnit, setFromUnit] = useState('mg');
  const [toUnit, setToUnit] = useState('mcg');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const debounceTimer = useRef(null);

  useEffect(() => {
    apiFetch('/calc/mass-units')
      .then(({ units: list }) => setUnits(list))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    if (value === '') {
      setResult(null);
      setError('');
      return;
    }
    debounceTimer.current = setTimeout(() => runConversion(), 250);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, fromUnit, toUnit]);

  async function runConversion() {
    setError('');
    try {
      const res = await apiFetch('/calc/convert-mass', {
        method: 'POST',
        body: JSON.stringify({ value, fromUnit, toUnit }),
      });
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(err.message);
    }
  }

  function swapUnits() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }

  return (
    <main className="page-container">
      <div className="card">
        <h1>Unit converter</h1>
        <p className="subtitle">
          Convert medication amounts between micrograms, milligrams, grams, kilograms and pounds -
          independent of the dose calculator. This is a general-purpose utility and is not saved
          to your calculation history.
        </p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <div className="field-group grouped">
          <label htmlFor="convertValue">
            Value <span className="required-tag">*</span>
          </label>
          <input
            type="number"
            id="convertValue"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 500"
          />
        </div>

        <div className="input-with-unit" style={{ alignItems: 'flex-end' }}>
          <div className="field-group" style={{ flex: 1 }}>
            <label htmlFor="fromUnit">From</label>
            <select id="fromUnit" value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}>
              {units.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={swapUnits}
            title="Swap units"
            aria-label="Swap units"
            style={{ marginBottom: 2 }}
          >
            &#8646;
          </button>

          <div className="field-group" style={{ flex: 1 }}>
            <label htmlFor="toUnit">To</label>
            <select id="toUnit" value={toUnit} onChange={(e) => setToUnit(e.target.value)}>
              {units.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {result && (
          <div className="calc-result">
            <p style={{ margin: 0 }}>Result</p>
            <p className="result-value">
              {result.result} {result.toUnit}
            </p>
            <p className="help-text" style={{ marginTop: 8 }}>
              {result.value} {result.fromUnit} = {result.result} {result.toUnit}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
