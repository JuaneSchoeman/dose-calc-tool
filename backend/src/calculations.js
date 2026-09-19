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
  // Bounds chosen to match the BSA values the Mosteller formula can
  // actually produce from the weight/height ranges above (min ≈ 0.065 m²
  // at 0.5 kg/30 cm, max ≈ 4.564 m² at 300 kg/250 cm), so a directly
  // entered BSA is held to the same real-world envelope as one derived
  // from weight and height.
  bsaM2: { min: 0.06, max: 4.6, label: 'BSA (m\u00b2)' },
};

const LB_PER_KG = 2.2046226218; // conversion factor, kg <-> lb
const INCH_PER_CM = 0.3937007874; // conversion factor, cm <-> inch
const STANDARD_BSA_M2 = 1.73; // reference adult BSA used by the 'ratio' dosing method only

// --- BSA-based dosing methods --------------------------------------------
// Two distinct, clinically-recognised calculations both get called
// "BSA-based dosing", and they are NOT interchangeable:
//
//   'direct' (default) - the standard method used in oncology and most
//     paediatric protocols. dosePerM2 IS the established mg/m² rate from
//     the drug protocol itself; you simply multiply it by the patient's
//     actual BSA. There is no "standard adult" reference size involved.
//       totalDose = dosePerM2 x patient BSA
//
//   'ratio' - a different technique, sometimes used to estimate a
//     paediatric (or otherwise non-standard-size) dose from a known
//     *adult* total dose when no paediatric-specific dosing data exists.
//     Here dosePerM2 represents that reference adult dose (in mg, not a
//     mg/m² rate), which is scaled by how the patient's BSA compares to
//     the historical reference adult BSA of 1.73 m².
//       totalDose = (patient BSA / 1.73) x reference adult dose
//
// Because these two produce very different numbers from the same inputs,
// the caller must be explicit about which is intended - 'direct' is only
// the default because it is the more commonly used of the two in general
// clinical practice (see calc.js route comments for how the choice is
// surfaced to the user).
const BSA_DOSE_METHODS = ['direct', 'ratio'];

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
 * BSA (m²) = √( (height_cm × weight_kg) / 3600 )
 * NFR4: results must match manually verified test cases within ±0.01
 */
function calculateBSA(weightKg, heightCm) {
  const bsa = Math.sqrt((heightCm * weightKg) / 3600);
  return round(bsa, 4);
}

// --- FR6: BSA-based dose -------------------------------------------
/**
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} dosePerM2 - meaning depends on `method`: for 'direct' this
 *   is a genuine mg/m^2 protocol rate; for 'ratio' this is a known reference
 *   (typically adult) total dose in mg. See BSA_DOSE_METHODS comment above.
 * @param {'direct'|'ratio'} [method='direct']
 * @returns {{ bsa: number, totalDose: number, method: string, steps: object[] }}
 */
function calculateBsaDose(weightKg, heightCm, dosePerM2, method = 'direct') {
  if (!BSA_DOSE_METHODS.includes(method)) {
    throw new Error(`Unsupported BSA dose method: ${method}`);
  }
  const bsa = calculateBSA(weightKg, heightCm);
  const totalDose = applyBsaDoseMethod(bsa, dosePerM2, method);

  const steps = [
    ...buildBsaCoreSteps(weightKg, heightCm, bsa),
    buildDoseFormulaStep(3, bsa, dosePerM2, totalDose, method),
  ];

  return { bsa, totalDose, method, steps };
}

// Shared arithmetic for both entry points (measurements-derived and
// directly-entered BSA) so the two calculation methods can never drift
// apart between calculateBsaDose and calculateDoseFromDirectBsa.
function applyBsaDoseMethod(bsa, dosePerM2, method) {
  return method === 'ratio'
    ? round((bsa / STANDARD_BSA_M2) * dosePerM2, 4)
    : round(bsa * dosePerM2, 4);
}

// Shared by calculateBsaDose and calculateBsaOnly, so the two step
// breakdowns stay word-for-word consistent wherever BSA itself is derived.
function buildBsaCoreSteps(weightKg, heightCm, bsa) {
  return [
    {
      title: 'Step 1 — Confirm inputs',
      formula: `weight = ${weightKg} kg, height = ${heightCm} cm`,
      latex: `\\text{weight} = ${weightKg}\\ \\text{kg}, \\quad \\text{height} = ${heightCm}\\ \\text{cm}`,
    },
    {
      title: 'Step 2 — Apply the Mosteller formula',
      formula: `BSA = √(height × weight ÷ 3600) = √(${heightCm} × ${weightKg} ÷ 3600) = ${bsa} m²`,
      latex: `\\text{BSA} = \\sqrt{\\dfrac{\\text{height} \\times \\text{weight}}{3600}} = \\sqrt{\\dfrac{${heightCm} \\times ${weightKg}}{3600}} = ${bsa}\\ \\text{m}^2`,
    },
  ];
}

// Shared by calculateBsaDose (BSA derived from weight/height) and
// calculateDoseFromDirectBsa (BSA entered directly) - the arithmetic once
// BSA is known is identical either way, only the step number differs
// depending on how many steps came before it. The formula text itself
// branches on `method` since 'direct' and 'ratio' are genuinely different
// calculations (see the BSA_DOSE_METHODS comment above).
function buildDoseFormulaStep(stepNumber, bsa, dosePerM2, totalDose, method = 'direct') {
  if (method === 'ratio') {
    return {
      title: `Step ${stepNumber} — Apply the BSA-ratio dose formula`,
      formula: `Total dose = (BSA ÷ ${STANDARD_BSA_M2} m²) × reference dose = (${bsa} ÷ ${STANDARD_BSA_M2}) × ${dosePerM2} = ${totalDose}`,
      latex: `\\text{Total dose} = \\left(\\dfrac{\\text{BSA}}{${STANDARD_BSA_M2}\\ \\text{m}^2}\\right) \\times \\text{reference dose} = \\left(\\dfrac{${bsa}}{${STANDARD_BSA_M2}}\\right) \\times ${dosePerM2} = ${totalDose}`,
    };
  }
  return {
    title: `Step ${stepNumber} — Apply the direct BSA dose formula`,
    formula: `Total dose = dose per m² × BSA = ${dosePerM2} × ${bsa} = ${totalDose}`,
    latex: `\\text{Total dose} = \\text{dose per m}^2 \\times \\text{BSA} = ${dosePerM2} \\times ${bsa} = ${totalDose}`,
  };
}

// --- Standalone BSA calculator -----------------------------------------
// Computes body surface area only - deliberately NOT wired into the
// weight-/BSA-dose calculators above. This lets a clinician or student look
// up a patient's BSA on its own (e.g. to sanity-check a chart value) without
// needing to enter a dose-per-m² figure the way the BSA-dose calculator
// requires.
/**
 * @param {number} weightKg
 * @param {number} heightCm
 * @returns {{ bsa: number, steps: object[] }}
 */
function calculateBsaOnly(weightKg, heightCm) {
  const bsa = calculateBSA(weightKg, heightCm);
  return { bsa, steps: buildBsaCoreSteps(weightKg, heightCm, bsa) };
}

// --- BSA-based dose, starting from a known BSA ---------------------------
// Alternative entry point for the BSA-dose calculator: a clinician who
// already knows the patient's BSA (e.g. from a chart, or from the
// standalone BSA calculator) can skip re-entering weight and height and
// dose directly off that BSA figure. Same dose arithmetic as
// calculateBsaDose, just without the weight/height/Mosteller step, since
// there's nothing to derive - BSA is already given.
/**
 * @param {number} bsa - body surface area in m^2, entered directly
 * @param {number} dosePerM2 - meaning depends on `method`; see
 *   calculateBsaDose above.
 * @param {'direct'|'ratio'} [method='direct']
 * @returns {{ totalDose: number, method: string, steps: object[] }}
 */
function calculateDoseFromDirectBsa(bsa, dosePerM2, method = 'direct') {
  if (!BSA_DOSE_METHODS.includes(method)) {
    throw new Error(`Unsupported BSA dose method: ${method}`);
  }
  const totalDose = applyBsaDoseMethod(bsa, dosePerM2, method);
  const steps = [
    {
      title: 'Step 1 — Confirm input',
      formula: `BSA = ${bsa} m²`,
      latex: `\\text{BSA} = ${bsa}\\ \\text{m}^2`,
    },
    buildDoseFormulaStep(2, bsa, dosePerM2, totalDose, method),
  ];
  return { totalDose, method, steps };
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
    {
      title: 'Step 1 — Confirm input',
      formula: `weight = ${weightKg} kg`,
      latex: `\\text{weight} = ${weightKg}\\ \\text{kg}`,
    },
    {
      title: 'Step 2 — Apply the dose formula',
      formula: `Total dose = weight (kg) × dose per kg = ${weightKg} × ${dosePerKg} = ${totalDose}`,
      latex: `\\text{Total dose} = \\text{weight}\\ (\\text{kg}) \\times \\text{dose per kg} = ${weightKg} \\times ${dosePerKg} = ${totalDose}`,
    },
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
//
// Note: the previous version of this table had a 'dg' key set to 10 and
// labeled "decagram" - that was a naming bug. The correct SI symbol for
// decigram (0.1 g) is 'dg'; decagram (10 g) is 'dag' or, informally in some
// regions, 'dkg' - which is the symbol used here to match what's commonly
// seen on kitchen scales and in some European countries. The old factor-10
// entry has been renamed to 'dkg' and a correct 'dg' (decigram) entry added.
const MASS_UNITS_TO_GRAMS = {
  mcg: 0.000001, // microgram
  mg: 0.001, // milligram
  cg: 0.01, // centigram
  dg: 0.1, // decigram
  gr: 0.06479891, // grain (apothecary/avoirdupois, exact by international agreement)
  g: 1, // gram
  dkg: 10, // decagram (SI symbol 'dag'; 'dkg' used here as the more commonly seen variant)
  hg: 100, // hectogram
  oz: 28.349523125, // ounce (avoirdupois, exact)
  kg: 1000, // kilogram
  lb: 453.59237, // pound (avoirdupois, exact)
  st: 6350.29318, // stone (14 lb)
};

const MASS_UNIT_LABELS = {
  mcg: 'mcg (microgram)',
  mg: 'mg (milligram)',
  cg: 'cg (centigram)',
  dg: 'dg (decigram)',
  gr: 'gr (grain)',
  g: 'g (gram)',
  dkg: 'dkg (decagram)',
  hg: 'hg (hectogram)',
  oz: 'oz (ounce)',
  kg: 'kg (kilogram)',
  lb: 'lb (pound)',
  st: 'st (stone)',
};

/**
 * Convert a mass value between any two supported units.
 * @param {number} value
 * @param {'mcg'|'mg'|'cg'|'dg'|'gr'|'g'|'dkg'|'hg'|'oz'|'kg'|'lb'|'st'} fromUnit
 * @param {'mcg'|'mg'|'cg'|'dg'|'gr'|'g'|'dkg'|'hg'|'oz'|'kg'|'lb'|'st'} toUnit
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
  // More decimal places for smaller target units (where results can be
  // very large numbers or need finer precision), fewer for larger units.
  const decimals = toUnit === 'mcg' ? 2 : ['mg', 'cg', 'dg', 'gr'].includes(toUnit) ? 4 : 6;
  return round(converted, decimals);
}

// --- Prescribed-dose unit whitelist ---------------------------------------
// The units above (mcg through lb) are the full set offered by the
// general-purpose standalone mass converter. A *prescribed dose* is a
// different, narrower concept: in real-world prescribing, a drug quantity
// is documented in micrograms, milligrams, or (occasionally, for larger
// volumes such as some antibiotics) grams - never in kilograms or pounds,
// which describe the *patient's body weight* rather than the amount of
// drug given, and never in centigrams or decagrams, which are not used in
// pharmaceutical practice. This whitelist keeps the "Prescribed dose" unit
// picker restricted to units a clinician would actually see on a drug
// chart, separate from the general mass converter's full unit list.
const DOSE_MASS_UNITS = ['mcg', 'mg', 'g'];

// --- Standalone unit conversion (length/height) --------------------------
// Independent height/length converter, separate from the height field
// embedded in the BSA-dose calculator above. All factors are expressed in
// centimetres (the base unit for this table); the inch factor (2.54 cm)
// matches the cm<->inch conversion already used for height elsewhere in
// this module (INCH_PER_CM = 1 / 2.54).
const LENGTH_UNITS_TO_CM = {
  mm: 0.1, // millimetre
  cm: 1, // centimetre
  inch: 2.54, // inch
  ft: 30.48, // foot
  m: 100, // metre
};

const LENGTH_UNIT_LABELS = {
  mm: 'mm (millimetre)',
  cm: 'cm (centimetre)',
  inch: 'in (inch)',
  ft: 'ft (foot)',
  m: 'm (metre)',
};

/**
 * Convert a length/height value between any two supported units.
 * @param {number} value
 * @param {'mm'|'cm'|'inch'|'ft'|'m'} fromUnit
 * @param {'mm'|'cm'|'inch'|'ft'|'m'} toUnit
 * @returns {number}
 */
function convertLength(value, fromUnit, toUnit) {
  const fromFactor = LENGTH_UNITS_TO_CM[fromUnit];
  const toFactor = LENGTH_UNITS_TO_CM[toUnit];
  if (!fromFactor || !toFactor) {
    throw new Error(`Unsupported length unit: ${!fromFactor ? fromUnit : toUnit}`);
  }
  const cm = Number(value) * fromFactor;
  const converted = cm / toFactor;
  const decimals = toUnit === 'mm' ? 2 : toUnit === 'm' ? 4 : 3;
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
  BSA_DOSE_METHODS,
  calculateBsaDose,
  calculateBsaOnly,
  calculateDoseFromDirectBsa,
  calculateWeightDose,
  round,
  MASS_UNITS_TO_GRAMS,
  MASS_UNIT_LABELS,
  DOSE_MASS_UNITS,
  convertMass,
  LENGTH_UNITS_TO_CM,
  LENGTH_UNIT_LABELS,
  convertLength,
  STANDARD_BSA_M2,
};
