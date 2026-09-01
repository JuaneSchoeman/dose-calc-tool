// routes/calc.js
// FR3: Select clinical category
// FR4: Select measurement units, input values, convert to standard values
// FR5-FR7: BSA / dose calculations (delegated to calculations.js, NFR14)
// FR8: Validate user input
// FR9: Step-by-step calculation breakdown
// FR10: Store calculation record for audit purposes (immutable, NFR10)
// FR12: View personal calculation history

const express = require('express');
const db = require('../db');
const calc = require('../calculations');
const { requireLogin } = require('./middleware');

const router = express.Router();

// FR3: clinical categories offered to the user (matches Table 3-1 areas)
const CATEGORIES = [
  'Adult Medical/Surgical',
  'Oncology',
  'Outpatient/Ambulatory',
  'Intensive Care',
  'Emergency Department',
  'Paediatrics',
];

router.get('/categories', requireLogin, (req, res) => {
  res.json({ categories: CATEGORIES });
});

// GET /calc/mass-units - list of supported mass units for the standalone converter
router.get('/mass-units', requireLogin, (req, res) => {
  const units = Object.keys(calc.MASS_UNITS_TO_GRAMS).map((key) => ({
    key,
    label: calc.MASS_UNIT_LABELS[key],
  }));
  res.json({ units });
});

// GET /calc/dose-units - restricted list of units for the "Prescribed dose"
// picker on the dose calculator. Deliberately narrower than /mass-units:
// see the DOSE_MASS_UNITS comment in calculations.js for why kg/lb/cg/dg
// are excluded here even though they're valid options in the general
// mass converter.
router.get('/dose-units', requireLogin, (req, res) => {
  const units = calc.DOSE_MASS_UNITS.map((key) => ({
    key,
    label: calc.MASS_UNIT_LABELS[key],
  }));
  res.json({ units });
});

// POST /calc/convert-mass - standalone unit conversion, independent of any
// patient calculation. Not written to the audit history table, since it is
// a general-purpose utility rather than a dose calculation.
// body: { value, fromUnit, toUnit }
router.post('/convert-mass', requireLogin, (req, res) => {
  const { value, fromUnit, toUnit } = req.body;

  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
    return res.status(400).json({ error: 'Please enter a numeric value to convert.' });
  }
  if (Number(value) < 0) {
    return res.status(400).json({ error: 'Value must not be negative.' });
  }
  if (!calc.MASS_UNITS_TO_GRAMS[fromUnit] || !calc.MASS_UNITS_TO_GRAMS[toUnit]) {
    return res.status(400).json({ error: 'Please select valid units to convert between.' });
  }

  try {
    const result = calc.convertMass(Number(value), fromUnit, toUnit);
    return res.json({ value: Number(value), fromUnit, toUnit, result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /calc/length-units - list of supported length/height units for the
// standalone height converter.
router.get('/length-units', requireLogin, (req, res) => {
  const units = Object.keys(calc.LENGTH_UNITS_TO_CM).map((key) => ({
    key,
    label: calc.LENGTH_UNIT_LABELS[key],
  }));
  res.json({ units });
});

// POST /calc/convert-length - standalone height/length conversion,
// independent of the BSA calculators. Not written to the audit history
// table, for the same reason as /convert-mass above.
// body: { value, fromUnit, toUnit }
router.post('/convert-length', requireLogin, (req, res) => {
  const { value, fromUnit, toUnit } = req.body;

  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
    return res.status(400).json({ error: 'Please enter a numeric value to convert.' });
  }
  if (Number(value) < 0) {
    return res.status(400).json({ error: 'Value must not be negative.' });
  }
  if (!calc.LENGTH_UNITS_TO_CM[fromUnit] || !calc.LENGTH_UNITS_TO_CM[toUnit]) {
    return res.status(400).json({ error: 'Please select valid units to convert between.' });
  }

  try {
    const result = calc.convertLength(Number(value), fromUnit, toUnit);
    return res.json({ value: Number(value), fromUnit, toUnit, result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /calc/bsa-only - standalone BSA calculator (Mosteller formula),
// deliberately separate from the BSA-based dose calculator in /calculate
// below. Returns BSA only, with no dose-per-m² input required. Like the
// converters above, this is a general-purpose utility and is not written
// to the audit history table.
// body: { weightValue, weightUnit, heightValue, heightUnit }
router.post('/bsa-only', requireLogin, (req, res) => {
  const { weightValue, weightUnit, heightValue, heightUnit } = req.body;

  const weightRangeKey = weightUnit === 'lb' ? 'weightLb' : 'weightKg';
  const weightCheck = calc.validateNumber(weightValue, weightRangeKey);
  if (!weightCheck.valid) return res.status(400).json({ error: weightCheck.message });

  const weightKg = calc.normaliseWeightToKg(weightValue, weightUnit);
  const heightCm = calc.normaliseHeightToCm(heightValue, heightUnit);
  const heightCheck = calc.validateNumber(heightCm, 'heightCm');
  if (!heightCheck.valid) return res.status(400).json({ error: heightCheck.message });

  const { bsa, steps } = calc.calculateBsaOnly(weightKg, heightCm);
  return res.json({ weightKg, heightCm, bsa, steps });
});

// POST /calc/validate - real-time, per-field validation used by the frontend
// as the user types (FR8, satisfies the UI guideline of validating input as
// it is entered rather than only on submit).
router.post('/validate', requireLogin, (req, res) => {
  const { field, value } = req.body;
  const rangeKey = FIELD_TO_RANGE[field];
  if (!rangeKey) {
    return res.status(400).json({ error: `Unknown field: ${field}` });
  }
  const result = calc.validateNumber(value, rangeKey);
  res.json(result);
});

const FIELD_TO_RANGE = {
  weightKg: 'weightKg',
  weightLb: 'weightLb',
  heightCm: 'heightCm',
  dosePerUnit: 'dosePerUnit',
};

// POST /calc/calculate  (FR4-FR9)
// body: { category, calcType: 'weight'|'bsa', weightValue, weightUnit,
//         heightValue?, heightUnit?, dosePerUnit, doseUnitLabel }
router.post('/calculate', requireLogin, (req, res) => {
  const {
    category,
    calcType,
    weightValue,
    weightUnit,
    heightValue,
    heightUnit,
    dosePerUnit,
    doseUnitLabel,
  } = req.body;

  // --- FR3 validation ---
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Please select a valid clinical category.' });
  }

  // --- FR8: validate weight ---
  const weightRangeKey = weightUnit === 'lb' ? 'weightLb' : 'weightKg';
  const weightCheck = calc.validateNumber(weightValue, weightRangeKey);
  if (!weightCheck.valid) return res.status(400).json({ error: weightCheck.message });

  // --- FR8: validate dose ---
  const doseCheck = calc.validateNumber(dosePerUnit, 'dosePerUnit');
  if (!doseCheck.valid) return res.status(400).json({ error: doseCheck.message });

  // --- FR4: normalise weight to kg ---
  const weightKg = calc.normaliseWeightToKg(weightValue, weightUnit);

  if (calcType === 'weight') {
    const { totalDose, steps } = calc.calculateWeightDose(weightKg, Number(dosePerUnit));

    const info = db
      .prepare(
        `INSERT INTO calculations
           (user_id, category, calc_type, weight_kg, height_cm, bsa_m2, dose_per_unit, total_dose, dose_unit)
         VALUES (?, ?, 'weight', ?, NULL, NULL, ?, ?, ?)`
      )
      .run(req.session.user.id, category, weightKg, Number(dosePerUnit), totalDose, doseUnitLabel || '');

    return res.json({
      calcId: info.lastInsertRowid,
      calcType: 'weight',
      weightKg,
      totalDose,
      doseUnit: doseUnitLabel || '',
      steps,
    });
  }

  if (calcType === 'bsa') {
    const heightCheck = calc.validateNumber(
      heightUnit === 'inch' ? calc.cmToInch(0) : heightValue,
      'heightCm'
    );
    // FR8: validate height directly in cm-equivalent terms
    const heightCm = calc.normaliseHeightToCm(heightValue, heightUnit);
    const heightRangeCheck = calc.validateNumber(heightCm, 'heightCm');
    if (!heightRangeCheck.valid) {
      return res.status(400).json({ error: heightRangeCheck.message });
    }
    void heightCheck;

    const { bsa, totalDose, steps } = calc.calculateBsaDose(weightKg, heightCm, Number(dosePerUnit));

    const info = db
      .prepare(
        `INSERT INTO calculations
           (user_id, category, calc_type, weight_kg, height_cm, bsa_m2, dose_per_unit, total_dose, dose_unit)
         VALUES (?, ?, 'bsa', ?, ?, ?, ?, ?, ?)`
      )
      .run(req.session.user.id, category, weightKg, heightCm, bsa, Number(dosePerUnit), totalDose, doseUnitLabel || '');

    return res.json({
      calcId: info.lastInsertRowid,
      calcType: 'bsa',
      weightKg,
      heightCm,
      bsa,
      totalDose,
      doseUnit: doseUnitLabel || '',
      steps,
    });
  }

  return res.status(400).json({ error: 'calcType must be "weight" or "bsa".' });
});

// GET /calc/history  (FR12) - the logged-in user's own past calculations only
router.get('/history', requireLogin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, category, calc_type, weight_kg, height_cm, bsa_m2, dose_per_unit, total_dose, dose_unit, created_at
       FROM calculations WHERE user_id = ? ORDER BY created_at DESC LIMIT 500`
    )
    .all(req.session.user.id);
  res.json({ history: rows });
});

module.exports = router;
