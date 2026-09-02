import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'General',
  'Adult Medical/Surgical',
  'Oncology',
  'Outpatient/Ambulatory',
  'ICU',
  'Emergency',
  'Paediatrics',
  'Pharmacy',
  'Other',
];

const initialState = {
  calculationType: 'weight-based',
  category: CATEGORIES[0],
  weightValue: '',
  weightUnit: 'kg',
  heightCm: '',
  dosePerKg: '',
  dosePerM2: '',
};

function tagClass(category) {
  return `tag tag-${category.replace(/\//g, '\\/')}`;
}

export default function Calculator() {
  const { authFetch } = useAuth();
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleReset() {
    setForm(initialState);
    setResult(null);
    setErrors([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setResult(null);
    setLoading(true);

    const endpoint =
      form.calculationType === 'weight-based' ? '/calculate/weight-based' : '/calculate/bsa-based';

    const body =
      form.calculationType === 'weight-based'
        ? {
            category: form.category,
            weightValue: form.weightValue,
            weightUnit: form.weightUnit,
            dosePerKg: form.dosePerKg,
          }
        : {
            category: form.category,
            weightValue: form.weightValue,
            weightUnit: form.weightUnit,
            heightCm: form.heightCm,
            dosePerM2: form.dosePerM2,
          };

    try {
      const res = await authFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors || ['An unknown error occurred.']);
      } else {
        setResult(data);
      }
    } catch (err) {
      setErrors(['Could not reach the calculation service. Please try again.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Calculate a dose</h2>

      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field">
            <span className="field-label">Calculation type</span>
            <select value={form.calculationType} onChange={(e) => updateField('calculationType', e.target.value)}>
              <option value="weight-based">Weight-based</option>
              <option value="bsa-based">BSA-based</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Clinical category</span>
            <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">Weight</span>
          <div className="field-row">
            <input
              type="number"
              step="any"
              value={form.weightValue}
              onChange={(e) => updateField('weightValue', e.target.value)}
              placeholder="e.g. 70"
            />
            <select className="unit-select" value={form.weightUnit} onChange={(e) => updateField('weightUnit', e.target.value)}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
          <span className="field-hint">Accepted range: 0.5–300 kg (1.1–660 lb)</span>
        </label>

        {form.calculationType === 'bsa-based' && (
          <label className="field">
            <span className="field-label">Height (cm)</span>
            <input
              type="number"
              step="any"
              value={form.heightCm}
              onChange={(e) => updateField('heightCm', e.target.value)}
              placeholder="e.g. 170"
            />
            <span className="field-hint">Accepted range: 30–250 cm</span>
          </label>
        )}

        {form.calculationType === 'weight-based' ? (
          <label className="field">
            <span className="field-label">Dose per kg</span>
            <input
              type="number"
              step="any"
              value={form.dosePerKg}
              onChange={(e) => updateField('dosePerKg', e.target.value)}
              placeholder="e.g. 2"
            />
          </label>
        ) : (
          <label className="field">
            <span className="field-label">Dose per m²</span>
            <input
              type="number"
              step="any"
              value={form.dosePerM2}
              onChange={(e) => updateField('dosePerM2', e.target.value)}
              placeholder="e.g. 100"
            />
          </label>
        )}

        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Reset
          </button>
        </div>
      </form>

      {errors.length > 0 && (
        <div className="alert alert-error" role="alert">
          {errors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      {result && (
        <div className="ledger">
          <div className="ledger-heading">
            <span className={tagClass(form.category)}>{form.category}</span>
            {'  '}Calculation trace
          </div>
          <div className="ledger-steps">
            {result.steps.map((step, i) => (
              <div className="ledger-step" key={i}>
                <div className="ledger-step-label">{step.label}</div>
              </div>
            ))}
          </div>
          <div className="result-chip">
            <span className="result-chip-label">Final dose</span>
            <span className="result-chip-value">{result.result}</span>
          </div>
        </div>
      )}
    </div>
  );
}
