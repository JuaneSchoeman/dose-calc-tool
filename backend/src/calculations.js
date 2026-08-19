/**
 * Core calculation engine — implements FR4 (unit conversion), FR5 (BSA),
 * FR6 (BSA-based dose), FR7 (weight-based dose), and FR9 (step-by-step
 * breakdown).
 *
 * Deliberately kept free of any Express/HTTP/DB concerns so the logic
 * can be unit-tested in isolation and reused unchanged if the
 * front-end or API layer ever changes (NFR14 — maintainability).
 */

const LB_TO_KG = 0.45359237;

/**
 * FR4 — Converts a weight value to kilograms, the artefact's internal
 * standard unit. Returns the value unchanged if already in kg.
 */
function convertWeightToKg(value, unit) {
  if (unit === 'kg') return value;
  if (unit === 'lb') return value * LB_TO_KG;
  throw new Error(`Unsupported weight unit: ${unit}`);
}

/**
 * FR5 — Calculates Body Surface Area using the Mosteller (1987) formula:
 * BSA (m²) = sqrt((height(cm) * weight(kg)) / 3600)
 */
function calculateBSA(weightKg, heightCm) {
  return Math.sqrt((heightCm * weightKg) / 3600);
}

/**
 * FR7 — Weight-based dose = dose per kg * weight (kg).
 */
function calculateWeightBasedDose(weightKg, dosePerKg) {
  return weightKg * dosePerKg;
}

/**
 * FR6 — BSA-based dose = dose per m² * BSA (m²).
 */
function calculateBSABasedDose(bsaM2, dosePerM2) {
  return bsaM2 * dosePerM2;
}

/**
 * Rounds a number to a fixed number of decimal places without floating
 * point display artefacts (e.g. 2.5000000000000004).
 */
function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * FR9 — Runs a full weight-based dose calculation and returns a
 * step-by-step breakdown, not just the final number.
 *
 * @param {number} weightValue - raw weight as entered by the user
 * @param {'kg'|'lb'} weightUnit
 * @param {number} dosePerKg
 */
function runWeightBasedCalculation(weightValue, weightUnit, dosePerKg) {
  const steps = [];

  const weightKg = convertWeightToKg(weightValue, weightUnit);
  steps.push({
    label:
      weightUnit === 'lb'
        ? `Convert weight: ${weightValue} lb × ${LB_TO_KG} = ${round(weightKg, 3)} kg`
        : `Weight already in kg: ${weightKg} kg`,
    value: round(weightKg, 3),
  });

  const dose = calculateWeightBasedDose(weightKg, dosePerKg);
  steps.push({
    label: `Calculate dose: ${round(weightKg, 3)} kg × ${dosePerKg} per kg = ${round(dose, 2)}`,
    value: round(dose, 2),
  });

  return {
    type: 'weight-based',
    weightKg: round(weightKg, 3),
    result: round(dose, 2),
    steps,
  };
}

/**
 * FR9 — Runs a full BSA-based dose calculation and returns a
 * step-by-step breakdown, not just the final number.
 *
 * @param {number} weightValue - raw weight as entered by the user
 * @param {'kg'|'lb'} weightUnit
 * @param {number} heightCm
 * @param {number} dosePerM2
 */
function runBSABasedCalculation(weightValue, weightUnit, heightCm, dosePerM2) {
  const steps = [];

  const weightKg = convertWeightToKg(weightValue, weightUnit);
  steps.push({
    label:
      weightUnit === 'lb'
        ? `Convert weight: ${weightValue} lb × ${LB_TO_KG} = ${round(weightKg, 3)} kg`
        : `Weight already in kg: ${weightKg} kg`,
    value: round(weightKg, 3),
  });

  const bsa = calculateBSA(weightKg, heightCm);
  steps.push({
    label: `Calculate BSA (Mosteller): √((${heightCm} × ${round(weightKg, 3)}) / 3600) = ${round(bsa, 3)} m²`,
    value: round(bsa, 3),
  });

  const dose = calculateBSABasedDose(bsa, dosePerM2);
  steps.push({
    label: `Calculate dose: ${round(bsa, 3)} m² × ${dosePerM2} per m² = ${round(dose, 2)}`,
    value: round(dose, 2),
  });

  return {
    type: 'bsa-based',
    weightKg: round(weightKg, 3),
    bsaM2: round(bsa, 3),
    result: round(dose, 2),
    steps,
  };
}

module.exports = {
  LB_TO_KG,
  convertWeightToKg,
  calculateBSA,
  calculateWeightBasedDose,
  calculateBSABasedDose,
  runWeightBasedCalculation,
  runBSABasedCalculation,
  round,
};
