// src/DoseCalculator.jsx
// FR3: select clinical category
// FR4: select units, input values, convert to standard values
// FR5-FR7: BSA / weight dose calculations (delegated to the backend, which
//          uses the separable calculations.js module - NFR14)
// FR8: validate user input (real-time, as the user types)
// FR9: step-by-step calculation breakdown
// FR11: reset/clear inputs

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from './api';
import Formula from './Formula';
import { sanitizeDecimalInput } from './utils/numberInput';

const STEPS = [
  { id: 1, label: '1. Category & type' },
  { id: 2, label: '2. Measurements' },
  { id: 3, label: '3. Result' },
];

function useDebouncedValidator(delay = 300) {
  const timer = useRef(null);
  return (fn) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, delay);
  };
}

export default function DoseCalculator() {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [calcType, setCalcType] = useState('weight');

  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightValue, setHeightValue] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [dosePerUnit, setDosePerUnit] = useState('');
  const [doseMassUnit, setDoseMassUnit] = useState('mg');
  const [massUnits, setMassUnits] = useState([]);

  const [weightError, setWeightError] = useState('');
  const [heightError, setHeightError] = useState('');
  const [doseError, setDoseError] = useState('');

  const [formError, setFormError] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  const debounce = useDebouncedValidator(300);

  useEffect(() => {
    apiFetch('/calc/categories')
      .then(({ categories: cats }) => setCategories(cats))
      .catch((err) => setFormError(err.message));
    apiFetch('/calc/dose-units')
      .then(({ units }) => setMassUnits(units))
      .catch(() => {
        /* Dose unit dropdown falls back to its default option if this fails;
           it isn't essential to completing a calculation. */
      });
  }, []);

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
    debounce(() => validateField(weightUnit === 'lb' ? 'weightLb' : 'weightKg', value, setWeightError));
  }

  function handleHeightChange(value) {
    setHeightValue(value);
    debounce(() => validateField('heightCm', value, setHeightError));
  }

  function handleDoseChange(value) {
    setDosePerUnit(value);
    debounce(() => validateField('dosePerUnit', value, setDoseError));
  }

  function handleStep1Submit(e) {
    e.preventDefault();
    if (!category) {
      setFormError('Please select a clinical category.');
      return;
    }
    setFormError('');
    setStep(2);
  }

  function resetStep2() {
    setWeightValue('');
    setWeightUnit('kg');
    setHeightValue('');
    setHeightUnit('cm');
    setDosePerUnit('');
    setDoseMassUnit('mg');
    setWeightError('');
    setHeightError('');
    setDoseError('');
  }

  async function handleCalculate(e) {
    e.preventDefault();
    setFormError('');
    setCalculating(true);
    const doseUnitLabel = doseMassUnit ? `${doseMassUnit}${calcType === 'bsa' ? '/m\u00b2' : '/kg'}` : '';
    try {
      const res = await apiFetch('/calc/calculate', {
        method: 'POST',
        body: JSON.stringify({
          category,
          calcType,
          weightValue,
          weightUnit,
          heightValue,
          heightUnit,
          dosePerUnit,
          doseUnitLabel,
        }),
      });
      setResult(res);
      setStep(3);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCalculating(false);
    }
  }

  function startNewCalculation() {
    resetStep2();
    setResult(null);
    setStep(1);
  }

  const isBsa = calcType === 'bsa';

  return (
    <div className="card">
      <h1>Dose calculator</h1>
      <p className="subtitle">
        Weight- and body-surface-area-based dose calculation, with unit conversion and a full
        step-by-step breakdown.
      </p>

      <div className="progress-steps">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`progress-step ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      {step === 1 && (
        <form onSubmit={handleStep1Submit}>
          <div className="field-grid">
          <div className="field-group">
            <label htmlFor="category">
              Clinical category <span className="required-tag">*</span>
            </label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="" disabled>
                Select a category...
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="help-text">Used only for audit/reporting purposes - does not affect the calculation.</p>
          </div>

          <div className="field-group">
            <label>
              Calculation type <span className="required-tag">*</span>
            </label>
            <div className="choice-group" role="radiogroup" aria-label="Calculation type">
              <div className="choice-option">
                <input
                  type="radio"
                  id="type-weight"
                  name="calcType"
                  value="weight"
                  checked={calcType === 'weight'}
                  onChange={() => setCalcType('weight')}
                />
                <label htmlFor="type-weight">Weight-based dose (mg/kg style)</label>
              </div>
              <div className="choice-option">
                <input
                  type="radio"
                  id="type-bsa"
                  name="calcType"
                  value="bsa"
                  checked={calcType === 'bsa'}
                  onChange={() => setCalcType('bsa')}
                />
                <label htmlFor="type-bsa">Body surface area (BSA)-based dose (mg/m² style)</label>
              </div>
            </div>
          </div>
          </div>

          <div className="btn-row">
            <button type="submit">Next</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleCalculate} noValidate>
          <div className="field-grid">
          <div className="field-group grouped">
            <label htmlFor="weightValue">
              Patient weight <span className="required-tag">*</span>
            </label>
            <div className="input-with-unit">
              <input
                type="text"
                inputMode="decimal"
                id="weightValue"
                required
                value={weightValue}
                onChange={(e) => handleWeightChange(sanitizeDecimalInput(e.target.value))}
              />
              <div className="unit-choice choice-group horizontal-compact" role="radiogroup" aria-label="Weight unit">
                <div className="choice-option">
                  <input
                    type="radio"
                    id="weight-kg"
                    name="weightUnit"
                    value="kg"
                    checked={weightUnit === 'kg'}
                    onChange={() => {
                      setWeightUnit('kg');
                      if (weightValue) debounce(() => validateField('weightKg', weightValue, setWeightError));
                    }}
                  />
                  <label htmlFor="weight-kg">kg</label>
                </div>
                <div className="choice-option">
                  <input
                    type="radio"
                    id="weight-lb"
                    name="weightUnit"
                    value="lb"
                    checked={weightUnit === 'lb'}
                    onChange={() => {
                      setWeightUnit('lb');
                      if (weightValue) debounce(() => validateField('weightLb', weightValue, setWeightError));
                    }}
                  />
                  <label htmlFor="weight-lb">lb</label>
                </div>
              </div>
            </div>
            <p className="help-text">Valid range: 0.5-300 kg.</p>
            <p className="field-error">{weightError}</p>
          </div>

          {isBsa && (
            <div className="field-group grouped">
              <label htmlFor="heightValue">
                Patient height <span className="required-tag">*</span>
              </label>
              <div className="input-with-unit">
                <input
                  type="text"
                  inputMode="decimal"
                  id="heightValue"
                  required={isBsa}
                  value={heightValue}
                  onChange={(e) => handleHeightChange(sanitizeDecimalInput(e.target.value))}
                />
                <div className="unit-choice choice-group horizontal-compact" role="radiogroup" aria-label="Height unit">
                  <div className="choice-option">
                    <input
                      type="radio"
                      id="height-cm"
                      name="heightUnit"
                      value="cm"
                      checked={heightUnit === 'cm'}
                      onChange={() => setHeightUnit('cm')}
                    />
                    <label htmlFor="height-cm">cm</label>
                  </div>
                  <div className="choice-option">
                    <input
                      type="radio"
                      id="height-inch"
                      name="heightUnit"
                      value="inch"
                      checked={heightUnit === 'inch'}
                      onChange={() => setHeightUnit('inch')}
                    />
                    <label htmlFor="height-inch">inch</label>
                  </div>
                </div>
              </div>
              <p className="help-text">Valid range: 30-250 cm.</p>
              <p className="field-error">{heightError}</p>
            </div>
          )}

          <div className="field-group grouped">
            <label htmlFor="dosePerUnit">
              Prescribed dose <span className="required-tag">*</span>
            </label>
            <div className="input-with-unit">
              <input
                type="text"
                inputMode="decimal"
                id="dosePerUnit"
                required
                value={dosePerUnit}
                onChange={(e) => handleDoseChange(sanitizeDecimalInput(e.target.value))}
              />
              <div className="dose-unit-picker">
                <select
                  id="doseMassUnit"
                  className="unit-choice"
                  aria-label="Dose mass unit"
                  value={doseMassUnit}
                  onChange={(e) => setDoseMassUnit(e.target.value)}
                >
                  {massUnits.map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.key}
                    </option>
                  ))}
                </select>
                <span className="dose-unit-suffix">/{isBsa ? 'm\u00b2' : 'kg'}</span>
              </div>
            </div>
            <p className="help-text">
              {isBsa ? 'Dose per square metre of body surface area.' : 'Dose per kilogram of body weight.'}
            </p>
            <p className="field-error">{doseError}</p>
          </div>
          </div>

          <div className="btn-row">
            <button type="button" className="secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="submit" disabled={calculating}>
              {calculating ? 'Calculating...' : 'Calculate'}
            </button>
            <button type="button" className="secondary" onClick={resetStep2}>
              Reset
            </button>
          </div>
        </form>
      )}

      {step === 3 && result && (
        <div>
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
            <p style={{ margin: 0 }}>Total dose</p>
            <p className="result-value">
              {result.totalDose} {result.doseUnit || ''}
            </p>
          </div>
          <div className="btn-row" style={{ marginTop: 20 }}>
            <button type="button" onClick={startNewCalculation}>
              Start a new calculation
            </button>
            <Link to="/history" className="btn secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              View history
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
