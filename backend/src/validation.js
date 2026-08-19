/**
 * Input validation — implements FR8 and the bounds defined in Table 4.2
 * (Input Validation Ranges) of the project documentation.
 *
 * Kept separate from calculations.js so validation rules can change
 * independently of calculation logic (NFR14 — maintainability).
 */

const RANGES = {
  weightKg: { min: 0.5, max: 300 },
  weightLb: { min: 1.1, max: 660 },
  heightCm: { min: 30, max: 250 },
  dose: { min: 0, max: Infinity }, // dose must be > 0, no fixed upper bound
};

/**
 * Checks a single numeric field against a min/max range.
 * Returns null if valid, or an error message string if invalid.
 */
function checkNumericField(value, fieldLabel, range, { exclusiveMin = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return `${fieldLabel} is required.`;
  }

  const num = Number(value);

  if (Number.isNaN(num) || typeof value === 'boolean') {
    return `${fieldLabel} must be a valid number.`;
  }

  if (exclusiveMin ? num <= range.min : num < range.min) {
    return `${fieldLabel} must be greater than ${range.min}.`;
  }

  if (num > range.max) {
    return `${fieldLabel} must not exceed ${range.max}.`;
  }

  return null;
}

/**
 * Validates weight + unit together (FR4/FR8).
 * unit must be 'kg' or 'lb' (NFR3).
 */
function validateWeight(weightValue, unit) {
  if (unit !== 'kg' && unit !== 'lb') {
    return "Weight unit must be 'kg' or 'lb'.";
  }
  const range = unit === 'kg' ? RANGES.weightKg : RANGES.weightLb;
  return checkNumericField(weightValue, `Weight (${unit})`, range);
}

/**
 * Validates height in cm (NFR3 — height is cm-only).
 */
function validateHeight(heightCm) {
  return checkNumericField(heightCm, 'Height (cm)', RANGES.heightCm);
}

/**
 * Validates a dose value (per kg or per m²) — must be strictly > 0.
 */
function validateDose(doseValue, label = 'Dose') {
  return checkNumericField(doseValue, label, RANGES.dose, { exclusiveMin: true });
}

module.exports = {
  RANGES,
  validateWeight,
  validateHeight,
  validateDose,
};
