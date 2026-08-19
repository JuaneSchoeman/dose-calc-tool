import { useState } from 'react';

const API_BASE = 'http://localhost:4000/api';

// FR3 — category is descriptive/reporting-only at this stage (Cycle 1 does not
// yet persist it anywhere; Cycle 3 will attach it to stored history records).
const CATEGORIES = [
  'Adult Medical/Surgical',
  'Oncology',
  'Outpatient/Ambulatory',
  'ICU',
  'Emergency',
  'Paediatrics',
];

const initialState = {
  calculationType: 'weight-based', // 'weight-based' | 'bsa-based'
  category: CATEGORIES[0],
  weightValue: '',
  weightUnit: 'kg',
  heightCm: '',
  dosePerKg: '',
  dosePerM2: '',
};

export default function DoseCalculator() {
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // FR11 — Reset/clear inputs
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
      form.calculationType === 'weight-based'
        ? `${API_BASE}/calculate/weight-based`
        : `${API_BASE}/calculate/bsa-based`;

    const body =
      form.calculationType === 'weight-based'
        ? {
            weightValue: form.weightValue,
            weightUnit: form.weightUnit,
            dosePerKg: form.dosePerKg,
          }
        : {
            weightValue: form.weightValue,
            weightUnit: form.weightUnit,
            heightCm: form.heightCm,
            dosePerM2: form.dosePerM2,
          };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        // FR8 — surface validation errors returned by the server
        setErrors(data.errors || ['An unknown error occurred.']);
      } else {
        // FR9 — step-by-step breakdown
        setResult(data);
      }
    } catch (err) {
      // NFR12 — clear user-facing error rather than failing silently
      setErrors(['Could not reach the calculation service. Please try again.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Dose Calculator</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Calculation type
          <select
            value={form.calculationType}
            onChange={(e) => updateField('calculationType', e.target.value)}
          >
            <option value="weight-based">Weight-based</option>
            <option value="bsa-based">BSA-based</option>
          </select>
        </label>

        {/* FR3 — category selection */}
        <label>
          Clinical category
          <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        {/* FR4 — weight + unit */}
        <label>
          Weight
          <input
            type="number"
            step="any"
            value={form.weightValue}
            onChange={(e) => updateField('weightValue', e.target.value)}
            placeholder="e.g. 70"
          />
          <select value={form.weightUnit} onChange={(e) => updateField('weightUnit', e.target.value)}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>

        {form.calculationType === 'bsa-based' && (
          <label>
            Height (cm)
            <input
              type="number"
              step="any"
              value={form.heightCm}
              onChange={(e) => updateField('heightCm', e.target.value)}
              placeholder="e.g. 170"
            />
          </label>
        )}

        {form.calculationType === 'weight-based' ? (
          <label>
            Dose per kg
            <input
              type="number"
              step="any"
              value={form.dosePerKg}
              onChange={(e) => updateField('dosePerKg', e.target.value)}
              placeholder="e.g. 2"
            />
          </label>
        ) : (
          <label>
            Dose per m²
            <input
              type="number"
              step="any"
              value={form.dosePerM2}
              onChange={(e) => updateField('dosePerM2', e.target.value)}
              placeholder="e.g. 100"
            />
          </label>
        )}

        <div style={{ marginTop: '1rem' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
          <button type="button" onClick={handleReset} style={{ marginLeft: '0.5rem' }}>
            Reset
          </button>
        </div>
      </form>

      {errors.length > 0 && (
        <div style={{ color: 'red', marginTop: '1rem' }}>
          {errors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1rem', border: '1px solid #ccc', padding: '1rem' }}>
          <h2>Result: {result.result}</h2>
          <h3>Steps</h3>
          <ol>
            {result.steps.map((step, i) => (
              <li key={i}>{step.label}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
