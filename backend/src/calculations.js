// calculations.js
//
// NFR14: All calculation logic (unit conversion, BSA, dose formulas) lives in
// this single, separable module. It has no dependency on the database, the
// web framework, or user-account concepts, so it can be modified in future
// (e.g. new units or formulae) without touching auth/reporting code, and can
// also be unit-tested or handed to an AI verifier in isolation (see the
// evaluation section of the empirical study).

// --- FR8 / Table 4.2: input validation ranges --------------------------
const VALID_RANGES = {
  weightKg: { min: 0.5, max: 300, label: 'Weight (kg)' },
  weightLb: { min: 1.1, max: 660, label: 'Weight (lb)' },
  heightCm: { min: 30, max: 250, label: 'Height (cm)' },
  dosePerUnit: { min: 0, max: Infinity, exclusiveMin: true, label: 'Dose' },
};

const LB_PER_KG = 2.2046226218; // conversion factor, kg <-> lb
const INCH_PER_CM = 0.3937007874; // conversion factor, cm <-> inch

/**
 * FR8: Validate a single numeric field against a named range.
 * Returns { valid: boolean, message?: string }
 */
function validateNumber(value, rangeKey) {
  const range = VALID_RANGES[rangeKey];
  if (!range) throw new Error(`Unknown validation range: ${rangeKey}`);

  const num = Number(value);

  if (value === '' || value === null || value === undefined || Number.isNaN(num)) {
    return { valid: false, message: `${range.label} must be a number.` };
  }
  if (range.exclusiveMin ? num <= range.min : num < range.min) {
    return {
      valid: false,
      message: `${range.label} must be greater than ${range.min}.`,
    };
  }
  if (num > range.max) {
    return {
      valid: false,
      message: `${range.label} must not exceed ${range.max}.`,
    };
  }
  return { valid: true };
}

// --- FR4: unit conversion -------------------------------------------
function lbToKg(lb) {
  return lb / LB_PER_KG;
}
function kgToLb(kg) {
  return kg * LB_PER_KG;
}
function inchToCm(inch) {
  return inch / INCH_PER_CM;
}
function cmToInch(cm) {
  return cm * INCH_PER_CM;
}

/**
 * FR4: Normalise a weight input (any supported unit) to kilograms.
 * @param {number} value
 * @param {'kg'|'lb'} unit
 */
function normaliseWeightToKg(value, unit) {
  const num = Number(value);
  if (unit === 'kg') return round(num, 4);
  if (unit === 'lb') return round(lbToKg(num), 4);
  throw new Error(`Unsupported weight unit: ${unit}`);
}

/**
 * FR4: Normalise a height input (any supported unit) to centimetres.
 * @param {number} value
 * @param {'cm'|'inch'} unit
 */
function normaliseHeightToCm(value, unit) {
  const num = Number(value);
  if (unit === 'cm') return round(num, 4);
  if (unit === 'inch') return round(inchToCm(num), 4);
  throw new Error(`Unsupported height unit: ${unit}`);
}

// --- FR5: Body Surface Area (Mosteller, 1987) --------------------------
/**
 * BSA (m^2) = sqrt( (height_cm * weight_kg) / 3600 )
 * NFR4: results must match manually verified test cases within +/-0.01
 */
function calculateBSA(weightKg, heightCm) {
  const bsa = Math.sqrt((heightCm * weightKg) / 3600);
  return round(bsa, 4);
}

// --- FR6: BSA-based dose -------------------------------------------
/**
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} dosePerM2 - generic dose per m^2 (e.g. mg/m^2)
 * @returns {{ bsa: number, totalDose: number, steps: string[] }}
 */
function calculateBsaDose(weightKg, heightCm, dosePerM2) {
  const bsa = calculateBSA(weightKg, heightCm);
  const totalDose = round((bsa/1.73) * dosePerM2, 4);

  const steps = [
    `Step 1 - Convert / confirm inputs: weight = ${weightKg} kg, height = ${heightCm} cm.`,
    `Step 2 - Apply the Mosteller formula: BSA = sqrt((height_cm x weight_kg) / 3600) = sqrt((${heightCm} x ${weightKg}) / 3600) = ${bsa} m^2.`,
    `Step 3 - Apply the dose formula: total dose = (BSA / 1.73) x dose per m^2 = (${bsa} / 1.73) x ${dosePerM2} = ${totalDose}.`,
  ];

  return { bsa, totalDose, steps };
}

// --- FR7: weight-based dose ------------------------------------------
/**
 * @param {number} weightKg
 * @param {number} dosePerKg - generic dose per kg
 * @returns {{ totalDose: number, steps: string[] }}
 */
function calculateWeightDose(weightKg, dosePerKg) {
  const totalDose = round(weightKg * dosePerKg, 4);

  const steps = [
    `Step 1 - Convert / confirm input: weight = ${weightKg} kg.`,
    `Step 2 - Apply the dose formula: total dose = weight_kg x dose per kg = ${weightKg} x ${dosePerKg} = ${totalDose}.`,
  ];

  return { totalDose, steps };
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// --- Standalone unit conversion (mass) ----------------------------------
// Addresses the mcg/mg/g/kg unit-confusion error type identified in the
// literature review (Section 3.3, "unit confusion (kg vs lb; mg vs mcg)")
// as one of the most frequent and dangerous causes of dose calculation
// errors. This is deliberately independent of the weight-/BSA-dose
// calculators above - it's a general-purpose mass converter, not tied to a
// patient calculation.
//
// All factors are expressed in grams (the base unit for this table).
const MASS_UNITS_TO_GRAMS = {
  mcg: 0.000001, // microgram
  mg: 0.001, // milligram
  g: 1, // gram
  kg: 1000, // kilogram
  lb: 453.59237, // pound (avoirdupois)
};

const MASS_UNIT_LABELS = {
  mcg: 'mcg (microgram)',
  mg: 'mg (milligram)',
  g: 'g (gram)',
  kg: 'kg (kilogram)',
  lb: 'lb (pound)',
};

/**
 * Convert a mass value between any two supported units.
 * @param {number} value
 * @param {'mcg'|'mg'|'g'|'kg'|'lb'} fromUnit
 * @param {'mcg'|'mg'|'g'|'kg'|'lb'} toUnit
 * @returns {number}
 */
function convertMass(value, fromUnit, toUnit) {
  const fromFactor = MASS_UNITS_TO_GRAMS[fromUnit];
  const toFactor = MASS_UNITS_TO_GRAMS[toUnit];
  if (!fromFactor || !toFactor) {
    throw new Error(`Unsupported mass unit: ${!fromFactor ? fromUnit : toUnit}`);
  }
  const grams = Number(value) * fromFactor;
  const converted = grams / toFactor;
  // More decimal places for very small target units (mcg) so small
  // quantities don't round away to zero; fewer for larger units.
  const decimals = toUnit === 'mcg' ? 2 : toUnit === 'mg' ? 4 : 6;
  return round(converted, decimals);
}

module.exports = {
  VALID_RANGES,
  validateNumber,
  lbToKg,
  kgToLb,
  inchToCm,
  cmToInch,
  normaliseWeightToKg,
  normaliseHeightToCm,
  calculateBSA,
  calculateBsaDose,
  calculateWeightDose,
  round,
  MASS_UNITS_TO_GRAMS,
  MASS_UNIT_LABELS,
  convertMass,
};
