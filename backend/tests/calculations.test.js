const {
  convertWeightToKg,
  calculateBSA,
  calculateWeightBasedDose,
  calculateBSABasedDose,
  runWeightBasedCalculation,
  runBSABasedCalculation,
  round,
} = require('../src/calculations');

const {
  validateWeight,
  validateHeight,
  validateDose,
} = require('../src/validation');

// ---- Unit conversion (FR4) ----
describe('convertWeightToKg', () => {
  test('kg passes through unchanged', () => {
    expect(convertWeightToKg(70, 'kg')).toBe(70);
  });

  test('lb converts correctly (Test case 5: 150 lb -> ~68.04 kg)', () => {
    expect(round(convertWeightToKg(150, 'lb'), 2)).toBeCloseTo(68.04, 1);
  });
});

// ---- BSA formula (FR5) ----
describe('calculateBSA (Mosteller)', () => {
  test('Test case 3: weight 70kg, height 170cm -> BSA ~1.81 m²', () => {
    expect(round(calculateBSA(70, 170), 2)).toBeCloseTo(1.81, 1);
  });

  test('Test case 4: weight 20kg, height 110cm -> BSA ~0.78 m²', () => {
    // Mosteller: sqrt((110*20)/3600) = sqrt(0.6111) = 0.7817
    expect(round(calculateBSA(20, 110), 2)).toBeCloseTo(0.78, 1);
  });
});

// ---- Weight-based dose (FR7) ----
describe('calculateWeightBasedDose', () => {
  test('Test case 1: 70kg * 2mg/kg = 140mg', () => {
    expect(calculateWeightBasedDose(70, 2)).toBe(140);
  });

  test('Test case 2: 5kg * 0.5mg/kg = 2.5mg', () => {
    expect(calculateWeightBasedDose(5, 0.5)).toBe(2.5);
  });
});

// ---- BSA-based dose (FR6) ----
describe('calculateBSABasedDose', () => {
  test('Test case 3: BSA 1.81 * 100mg/m² = 181mg', () => {
    expect(round(calculateBSABasedDose(1.81, 100), 0)).toBe(181);
  });
});

// ---- Full pipeline with step breakdown (FR9) ----
describe('runWeightBasedCalculation', () => {
  test('Test case 1 full pipeline: 70kg, 2mg/kg -> 140mg with steps', () => {
    const result = runWeightBasedCalculation(70, 'kg', 2);
    expect(result.result).toBe(140);
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });

  test('Test case 5 full pipeline: 150lb, 1.5mg/kg -> ~102mg', () => {
    const result = runWeightBasedCalculation(150, 'lb', 1.5);
    expect(result.result).toBeCloseTo(102.06, 0);
  });
});

describe('runBSABasedCalculation', () => {
  test('Test case 3 full pipeline: 70kg, 170cm, 100mg/m² -> ~181.81mg', () => {
    // Note: the draft test-case table rounded BSA to 1.81 before hand-calculating
    // the dose (giving 181mg). The precise, un-rounded value is used here instead,
    // since the artefact itself calculates from full precision, not from a
    // rounded intermediate. See NFR4 — results must match manually verified values.
    const result = runBSABasedCalculation(70, 'kg', 170, 100);
    expect(result.bsaM2).toBeCloseTo(1.818, 2);
    expect(result.result).toBeCloseTo(181.81, 1);
  });
});

// ---- Validation (FR8, Table 4.2) ----
describe('validateWeight', () => {
  test('Test case 6: negative weight is rejected', () => {
    expect(validateWeight(-5, 'kg')).not.toBeNull();
  });

  test('valid weight passes', () => {
    expect(validateWeight(70, 'kg')).toBeNull();
  });

  test('weight above max (300kg) is rejected', () => {
    expect(validateWeight(301, 'kg')).not.toBeNull();
  });

  test('invalid unit is rejected', () => {
    expect(validateWeight(70, 'stone')).not.toBeNull();
  });
});

describe('validateHeight', () => {
  test('Test case 7: height of 0 is rejected', () => {
    expect(validateHeight(0)).not.toBeNull();
  });

  test('valid height passes', () => {
    expect(validateHeight(170)).toBeNull();
  });

  test('height above max (250cm) is rejected', () => {
    expect(validateHeight(251)).not.toBeNull();
  });
});

describe('validateDose', () => {
  test('zero dose is rejected (must be > 0)', () => {
    expect(validateDose(0)).not.toBeNull();
  });

  test('negative dose is rejected', () => {
    expect(validateDose(-2)).not.toBeNull();
  });

  test('valid dose passes', () => {
    expect(validateDose(2)).toBeNull();
  });

  test('non-numeric dose is rejected', () => {
    expect(validateDose('abc')).not.toBeNull();
  });
});
