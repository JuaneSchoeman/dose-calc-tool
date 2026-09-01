// src/pages/ConverterPage.jsx
// "Tools" page: three standalone utilities, none of them tied to a patient
// dose calculation and none of them written to the calculation history.
//   - Mass converter (mcg/mg/cg/g/dg/kg/lb)
//   - Height converter (mm/cm/inch/ft/m)
//   - BSA calculator (Mosteller formula) - deliberately separate from the
//     BSA-based dose calculator on the Calculator page, for looking up a
//     patient's BSA on its own without needing a dose-per-m² figure.

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api';
import Formula from '../Formula';
import { sanitizeDecimalInput } from '../utils/numberInput';

const TABS = [
  { id: 'mass', label: 'Mass converter' },
  { id: 'height', label: 'Height converter' },
  { id: 'bsa', label: 'BSA calculator' },
];

export default function ConverterPage() {
  const [tab, setTab] = useState('mass');

  return (
    <main className="page-container medium">
      <div className="card">
        <h1>Tools</h1>
        <p className="subtitle">
          Standalone converters and a BSA calculator, independent of the dose calculator. Nothing
          on this page is saved to your calculation history.
        </p>

        <div className="tool-tabs" role="tablist" aria-label="Tool selection">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tool-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'mass' && <MassConverter />}
        {tab === 'height' && <HeightConverter />}
        {tab === 'bsa' && <BsaCalculator />}
      </div>
    </main>
  );
}

/* --- Mass converter (mcg/mg/cg/g/dg/kg/lb) -------------------------------- */
function MassConverter() {
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
    debounceTimer.current = setTimeout(runConversion, 250);
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
    <div>
      <p className="subtitle">
        Convert medication amounts between micrograms, milligrams, centigrams, grams, decagrams,
        kilograms, and pounds.
      </p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="field-group grouped">
        <label htmlFor="massValue">
          Value <span className="required-tag">*</span>
        </label>
        <input
          type="text"
          inputMode="decimal"
          id="massValue"
          value={value}
          onChange={(e) => setValue(sanitizeDecimalInput(e.target.value))}
          placeholder="e.g. 500"
        />
      </div>

      <div className="input-with-unit" style={{ alignItems: 'flex-end' }}>
        <div className="field-group" style={{ flex: 1 }}>
          <label htmlFor="massFromUnit">From</label>
          <select id="massFromUnit" value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}>
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
          <label htmlFor="massToUnit">To</label>
          <select id="massToUnit" value={toUnit} onChange={(e) => setToUnit(e.target.value)}>
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
  );
}

/* --- Height converter (mm/cm/inch/ft/m) ------------------------------------ */
function HeightConverter() {
  const [units, setUnits] = useState([]);
  const [value, setValue] = useState('');
  const [fromUnit, setFromUnit] = useState('cm');
  const [toUnit, setToUnit] = useState('inch');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const debounceTimer = useRef(null);

  useEffect(() => {
    apiFetch('/calc/length-units')
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
    debounceTimer.current = setTimeout(runConversion, 250);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, fromUnit, toUnit]);

  async function runConversion() {
    setError('');
    try {
      const res = await apiFetch('/calc/convert-length', {
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
    <div>
      <p className="subtitle">
        Convert patient height / length between millimetres, centimetres, inches, feet, and
        metres.
      </p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="field-group grouped">
        <label htmlFor="heightConvertValue">
          Value <span className="required-tag">*</span>
        </label>
        <input
          type="text"
          inputMode="decimal"
          id="heightConvertValue"
          value={value}
          onChange={(e) => setValue(sanitizeDecimalInput(e.target.value))}
          placeholder="e.g. 170"
        />
      </div>

      <div className="input-with-unit" style={{ alignItems: 'flex-end' }}>
        <div className="field-group" style={{ flex: 1 }}>
          <label htmlFor="heightFromUnit">From</label>
          <select id="heightFromUnit" value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}>
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
          <label htmlFor="heightToUnit">To</label>
          <select id="heightToUnit" value={toUnit} onChange={(e) => setToUnit(e.target.value)}>
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
  );
}

/* --- Standalone BSA calculator (Mosteller) --------------------------------
   Deliberately not integrated into the BSA-based dose calculator on the
   Calculator page - this only returns BSA, with no dose-per-m² input. */
function BsaCalculator() {
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightValue, setHeightValue] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');

  const [weightError, setWeightError] = useState('');
  const [heightError, setHeightError] = useState('');
  const [formError, setFormError] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  const weightTimer = useRef(null);
  const heightTimer = useRef(null);

  async function validateField(field, value, setter) {
    if (value === '') return setter('');
    try {
      const res = await apiFetch('/calc/validate', {
        method: 'POST',
        body: JSON.stringify({ field, value }),
      });
      setter(res.valid ? '' : res.message);
    } catch (err) {
      setter(err.message);
    }
  }

  function handleWeightChange(value) {
    setWeightValue(value);
    setResult(null);
    clearTimeout(weightTimer.current);
    weightTimer.current = setTimeout(
      () => validateField(weightUnit === 'lb' ? 'weightLb' : 'weightKg', value, setWeightError),
      300
    );
  }

  function handleHeightChange(value) {
    setHeightValue(value);
    setResult(null);
    clearTimeout(heightTimer.current);
    heightTimer.current = setTimeout(() => validateField('heightCm', value, setHeightError), 300);
  }

  function reset() {
    setWeightValue('');
    setHeightValue('');
    setWeightUnit('kg');
    setHeightUnit('cm');
    setWeightError('');
    setHeightError('');
    setFormError('');
    setResult(null);
  }

  async function handleCalculate(e) {
    e.preventDefault();
    setFormError('');
    setCalculating(true);
    try {
      const res = await apiFetch('/calc/bsa-only', {
        method: 'POST',
        body: JSON.stringify({ weightValue, weightUnit, heightValue, heightUnit }),
      });
      setResult(res);
    } catch (err) {
      setResult(null);
      setFormError(err.message);
    } finally {
      setCalculating(false);
    }
  }

  return (
    <div>
      <p className="subtitle">
        Calculate a patient's body surface area (Mosteller formula) on its own - no dose figure
        required.
      </p>

      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <form onSubmit={handleCalculate} noValidate>
        <div className="field-grid">
          <div className="field-group grouped">
            <label htmlFor="bsaWeightValue">
              Patient weight <span className="required-tag">*</span>
            </label>
            <div className="input-with-unit">
              <input
                type="text"
                inputMode="decimal"
                id="bsaWeightValue"
                required
                value={weightValue}
                onChange={(e) => handleWeightChange(sanitizeDecimalInput(e.target.value))}
              />
              <div className="unit-choice choice-group horizontal-compact" role="radiogroup" aria-label="Weight unit">
                <div className="choice-option">
                  <input
                    type="radio"
                    id="bsa-weight-kg"
                    name="bsaWeightUnit"
                    value="kg"
                    checked={weightUnit === 'kg'}
                    onChange={() => {
                      setWeightUnit('kg');
                      if (weightValue) validateField('weightKg', weightValue, setWeightError);
                    }}
                  />
                  <label htmlFor="bsa-weight-kg">kg</label>
                </div>
                <div className="choice-option">
                  <input
                    type="radio"
                    id="bsa-weight-lb"
                    name="bsaWeightUnit"
                    value="lb"
                    checked={weightUnit === 'lb'}
                    onChange={() => {
                      setWeightUnit('lb');
                      if (weightValue) validateField('weightLb', weightValue, setWeightError);
                    }}
                  />
                  <label htmlFor="bsa-weight-lb">lb</label>
                </div>
              </div>
            </div>
            <p className="help-text">Valid range: 0.5-300 kg.</p>
            <p className="field-error">{weightError}</p>
          </div>

          <div className="field-group grouped">
            <label htmlFor="bsaHeightValue">
              Patient height <span className="required-tag">*</span>
            </label>
            <div className="input-with-unit">
              <input
                type="text"
                inputMode="decimal"
                id="bsaHeightValue"
                required
                value={heightValue}
                onChange={(e) => handleHeightChange(sanitizeDecimalInput(e.target.value))}
              />
              <div className="unit-choice choice-group horizontal-compact" role="radiogroup" aria-label="Height unit">
                <div className="choice-option">
                  <input
                    type="radio"
                    id="bsa-height-cm"
                    name="bsaHeightUnit"
                    value="cm"
                    checked={heightUnit === 'cm'}
                    onChange={() => setHeightUnit('cm')}
                  />
                  <label htmlFor="bsa-height-cm">cm</label>
                </div>
                <div className="choice-option">
                  <input
                    type="radio"
                    id="bsa-height-inch"
                    name="bsaHeightUnit"
                    value="inch"
                    checked={heightUnit === 'inch'}
                    onChange={() => setHeightUnit('inch')}
                  />
                  <label htmlFor="bsa-height-inch">inch</label>
                </div>
              </div>
            </div>
            <p className="help-text">Valid range: 30-250 cm.</p>
            <p className="field-error">{heightError}</p>
          </div>
        </div>

        <div className="btn-row">
          <button type="submit" disabled={calculating}>
            {calculating ? 'Calculating...' : 'Calculate BSA'}
          </button>
          <button type="button" className="secondary" onClick={reset}>
            Reset
          </button>
        </div>
      </form>

      {result && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <h2>Result</h2>
          <ol className="calc-steps">
            {result.steps.map((s, i) => (
              <li key={i}>
                <p className="calc-step-title">{s.title}</p>
                <Formula latex={s.latex} fallback={s.formula} />
              </li>
            ))}
          </ol>
          <div className="calc-result">
            <p style={{ margin: 0 }}>Body surface area</p>
            <p className="result-value">{result.bsa} m²</p>
          </div>
        </div>
      )}
    </div>
  );
}
