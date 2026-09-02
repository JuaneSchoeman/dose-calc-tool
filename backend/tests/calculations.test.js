// tests/calculations.test.js
//
// Unit tests for the separable calculation module (NFR14). These are the
// same kind of manually-verified test cases described in the empirical
// study's evaluation section (Chapter 4, "Utility is assessed by comparing
// the tool's output against manually calculated values"). Each expected
// value below was computed by hand / calculator, independently of the
// application code, then asserted with a tolerance of ±0.01 (NFR4).

const calc = require('../src/calculations');

describe('unit conversion (FR4)', () => {
  test('lbToKg converts pounds to kilograms', () => {
    // 154 lb / 2.2046226218 = 69.8532...
    expect(calc.lbToKg(154)).toBeCloseTo(69.8532, 2);
  });

  test('kgToLb converts kilograms to pounds', () => {
    // 70 kg * 2.2046226218 = 154.3236 lb
    expect(calc.kgToLb(70)).toBeCloseTo(154.3236, 2);
  });

  test('inchToCm converts inches to centimetres', () => {
    // 67 inch / 0.3937007874 = 170.18 cm
    expect(calc.inchToCm(67)).toBeCloseTo(170.18, 1);
  });

  test('normaliseWeightToKg passes kg through unchanged', () => {
    expect(calc.normaliseWeightToKg(70, 'kg')).toBe(70);
  });

  test('normaliseWeightToKg converts lb input to kg', () => {
    expect(calc.normaliseWeightToKg(154, 'lb')).toBeCloseTo(69.8532, 2);
  });
});

describe('BSA calculation - Mosteller formula (FR5, NFR4)', () => {
  test('70 kg, 170 cm -> BSA 1.82 m^2', () => {
    // sqrt((170 * 70) / 3600) = sqrt(3.3055...) = 1.8181
    expect(calc.calculateBSA(70, 170)).toBeCloseTo(1.82, 2);
  });

  test('20 kg, 110 cm (paediatric case) -> BSA 0.78 m^2', () => {
    // sqrt((110 * 20) / 3600) = sqrt(0.6111) = 0.7817
    expect(calc.calculateBSA(20, 110)).toBeCloseTo(0.78, 2);
  });

  test('90 kg, 190 cm -> BSA 2.18 m^2', () => {
    // sqrt((190 * 90) / 3600) = sqrt(4.75) = 2.1794
    expect(calc.calculateBSA(90, 190)).toBeCloseTo(2.18, 2);
  });
});

describe('BSA-based dose (FR6, normalised to 1.73 m²)', () => {
  test('70 kg, 170 cm, 100 mg/m^2 -> BSA 1.8181, dose normalised to 1.73 m^2 -> 105.0925', () => {
    const { bsa, totalDose } = calc.calculateBsaDose(70, 170, 100);
    expect(bsa).toBeCloseTo(1.8181, 2);
    expect(totalDose).toBeCloseTo(105.0925, 3);
  });

  test('a patient exactly at the reference 1.73 m^2 BSA gets the unscaled dose', () => {
    // height=170cm, weight~63.38kg gives BSA = sqrt((170*63.38)/3600) = 1.73 m^2
    const { bsa, totalDose } = calc.calculateBsaDose(63.38, 170, 100);
    expect(bsa).toBeCloseTo(1.73, 2);
    expect(totalDose).toBeCloseTo(100, 0);
  });

  test('returns a three-step breakdown (FR9)', () => {
    const { steps } = calc.calculateBsaDose(70, 170, 100);
    expect(steps).toHaveLength(3);
  });

  test('every step includes a title, plain-text formula, and LaTeX expression', () => {
    const { steps } = calc.calculateBsaDose(70, 170, 100);
    steps.forEach((step) => {
      expect(typeof step.title).toBe('string');
      expect(step.title.length).toBeGreaterThan(0);
      expect(typeof step.formula).toBe('string');
      expect(step.formula.length).toBeGreaterThan(0);
      expect(typeof step.latex).toBe('string');
      expect(step.latex.length).toBeGreaterThan(0);
    });
  });
});

describe('BSA-based dose, entered directly (calculateDoseFromDirectBsa)', () => {
  test('BSA 1.8181, 100 mg/m^2 -> matches the measurements-derived dose for the same BSA', () => {
    const direct = calc.calculateDoseFromDirectBsa(1.8181, 100);
    const fromMeasurements = calc.calculateBsaDose(70, 170, 100);
    expect(direct.totalDose).toBe(fromMeasurements.totalDose);
  });

  test('a directly entered reference 1.73 m^2 BSA gets the unscaled dose', () => {
    const { totalDose } = calc.calculateDoseFromDirectBsa(1.73, 100);
    expect(totalDose).toBeCloseTo(100, 0);
  });

  test('returns a two-step breakdown (no weight/height/Mosteller step, since BSA is already given)', () => {
    const { steps } = calc.calculateDoseFromDirectBsa(1.82, 100);
    expect(steps).toHaveLength(2);
    expect(steps.some((s) => /mosteller/i.test(s.title))).toBe(false);
  });

  test('every step includes a title, plain-text formula, and LaTeX expression', () => {
    const { steps } = calc.calculateDoseFromDirectBsa(1.82, 100);
    steps.forEach((step) => {
      expect(typeof step.title).toBe('string');
      expect(step.title.length).toBeGreaterThan(0);
      expect(typeof step.formula).toBe('string');
      expect(step.formula.length).toBeGreaterThan(0);
      expect(typeof step.latex).toBe('string');
      expect(step.latex.length).toBeGreaterThan(0);
    });
  });
});

describe('weight-based dose (FR7)', () => {
  test('20 kg, 5 mg/kg -> 100 mg', () => {
    const { totalDose } = calc.calculateWeightDose(20, 5);
    expect(totalDose).toBe(100);
  });

  test('4.5 kg (small infant), 2.5 mg/kg -> 11.25 mg', () => {
    const { totalDose } = calc.calculateWeightDose(4.5, 2.5);
    expect(totalDose).toBeCloseTo(11.25, 2);
  });

  test('returns a two-step breakdown (FR9)', () => {
    const { steps } = calc.calculateWeightDose(20, 5);
    expect(steps).toHaveLength(2);
  });

  test('every step includes a title, plain-text formula, and LaTeX expression', () => {
    const { steps } = calc.calculateWeightDose(20, 5);
    steps.forEach((step) => {
      expect(typeof step.title).toBe('string');
      expect(step.title.length).toBeGreaterThan(0);
      expect(typeof step.formula).toBe('string');
      expect(step.formula.length).toBeGreaterThan(0);
      expect(typeof step.latex).toBe('string');
      expect(step.latex.length).toBeGreaterThan(0);
    });
  });
});

describe('standalone mass unit conversion (mcg/mg/g/kg/lb)', () => {
  test('1 g -> 1000 mg', () => {
    expect(calc.convertMass(1, 'g', 'mg')).toBe(1000);
  });

  test('1 g -> 1,000,000 mcg', () => {
    expect(calc.convertMass(1, 'g', 'mcg')).toBe(1000000);
  });

  test('500 mcg -> 0.5 mg', () => {
    expect(calc.convertMass(500, 'mcg', 'mg')).toBe(0.5);
  });

  test('2.5 mg -> 2500 mcg', () => {
    expect(calc.convertMass(2.5, 'mg', 'mcg')).toBe(2500);
  });

  test('1 kg -> ~2.2046 lb', () => {
    expect(calc.convertMass(1, 'kg', 'lb')).toBeCloseTo(2.2046, 3);
  });

  test('154 lb -> ~69.8532 kg', () => {
    expect(calc.convertMass(154, 'lb', 'kg')).toBeCloseTo(69.8532, 2);
  });

  test('round-trip g -> mcg -> g returns the original value', () => {
    const mcg = calc.convertMass(3.2, 'g', 'mcg');
    const backToG = calc.convertMass(mcg, 'mcg', 'g');
    expect(backToG).toBeCloseTo(3.2, 4);
  });

  test('throws on an unsupported unit', () => {
    expect(() => calc.convertMass(1, 'g', 'stone')).toThrow();
  });

  test('converts decagrams to grams', () => {
    // 5 dg = 50 g
    expect(calc.convertMass(5, 'dg', 'g')).toBeCloseTo(50, 4);
  });

  test('converts decagrams to milligrams', () => {
    // 1 dg = 10000 mg
    expect(calc.convertMass(1, 'dg', 'mg')).toBeCloseTo(10000, 2);
  });

  test('converts centigrams to grams', () => {
    // 250 cg = 2.5 g
    expect(calc.convertMass(250, 'cg', 'g')).toBeCloseTo(2.5, 4);
  });

  test('converts grams to centigrams', () => {
    // 1 g = 100 cg
    expect(calc.convertMass(1, 'g', 'cg')).toBeCloseTo(100, 2);
  });
});

describe('prescribed-dose unit whitelist (DOSE_MASS_UNITS)', () => {
  test('only exposes units a drug dose is actually prescribed in', () => {
    // mcg/mg/g are real prescribing units; kg/lb describe body weight (not
    // drug quantity) and cg/dg are not used in pharmaceutical practice, so
    // none of those four belong in the dose-unit picker.
    expect(calc.DOSE_MASS_UNITS).toEqual(['mcg', 'mg', 'g']);
    expect(calc.DOSE_MASS_UNITS).not.toEqual(expect.arrayContaining(['kg', 'lb', 'cg', 'dg']));
  });

  test('every whitelisted unit is a valid, convertible mass unit', () => {
    calc.DOSE_MASS_UNITS.forEach((unit) => {
      expect(calc.MASS_UNITS_TO_GRAMS[unit]).toBeDefined();
      expect(calc.MASS_UNIT_LABELS[unit]).toBeDefined();
    });
  });
});

describe('standalone length/height conversion', () => {
  test('converts inches to centimetres', () => {
    // 70 inch * 2.54 = 177.8 cm
    expect(calc.convertLength(70, 'inch', 'cm')).toBeCloseTo(177.8, 2);
  });

  test('converts centimetres to metres', () => {
    expect(calc.convertLength(180, 'cm', 'm')).toBeCloseTo(1.8, 4);
  });

  test('converts feet to centimetres', () => {
    // 6 ft * 30.48 = 182.88 cm
    expect(calc.convertLength(6, 'ft', 'cm')).toBeCloseTo(182.88, 2);
  });

  test('throws on an unsupported unit', () => {
    expect(() => calc.convertLength(1, 'cm', 'yard')).toThrow();
  });
});

describe('standalone BSA calculator (independent of BSA-dose calculation)', () => {
  test('70 kg, 170 cm -> BSA 1.82 m^2, no dose fields present', () => {
    const { bsa, steps } = calc.calculateBsaOnly(70, 170);
    expect(bsa).toBeCloseTo(1.82, 2);
    expect(steps).toHaveLength(2);
    expect(steps.some((s) => /dose/i.test(s.title))).toBe(false);
  });

  test('matches the BSA figure produced inside the BSA-dose calculator', () => {
    const standalone = calc.calculateBsaOnly(90, 190);
    const { bsa: doseCalcBsa } = calc.calculateBsaDose(90, 190, 100);
    expect(standalone.bsa).toBe(doseCalcBsa);
  });
});

describe('input validation ranges (FR8, Table 4.2)', () => {
  test('rejects weight below 0.5 kg', () => {
    expect(calc.validateNumber(0.2, 'weightKg').valid).toBe(false);
  });

  test('rejects weight above 300 kg', () => {
    expect(calc.validateNumber(301, 'weightKg').valid).toBe(false);
  });

  test('accepts weight within range', () => {
    expect(calc.validateNumber(70, 'weightKg').valid).toBe(true);
  });

  test('rejects height below 30 cm', () => {
    expect(calc.validateNumber(20, 'heightCm').valid).toBe(false);
  });

  test('rejects height above 250 cm', () => {
    expect(calc.validateNumber(260, 'heightCm').valid).toBe(false);
  });

  test('rejects zero or negative dose (exclusive minimum)', () => {
    expect(calc.validateNumber(0, 'dosePerUnit').valid).toBe(false);
    expect(calc.validateNumber(-5, 'dosePerUnit').valid).toBe(false);
  });

  test('accepts a directly entered BSA within range', () => {
    expect(calc.validateNumber(1.82, 'bsaM2').valid).toBe(true);
  });

  test('rejects a directly entered BSA below the achievable range', () => {
    expect(calc.validateNumber(0.01, 'bsaM2').valid).toBe(false);
  });

  test('rejects a directly entered BSA above the achievable range', () => {
    expect(calc.validateNumber(10, 'bsaM2').valid).toBe(false);
  });

  test('the bsaM2 range covers every BSA the Mosteller formula can produce from the weight/height ranges', () => {
    const minPossibleBsa = calc.calculateBSA(0.5, 30);
    const maxPossibleBsa = calc.calculateBSA(300, 250);
    expect(calc.validateNumber(minPossibleBsa, 'bsaM2').valid).toBe(true);
    expect(calc.validateNumber(maxPossibleBsa, 'bsaM2').valid).toBe(true);
  });

  test('rejects non-numeric input', () => {
    expect(calc.validateNumber('abc', 'weightKg').valid).toBe(false);
    expect(calc.validateNumber('', 'weightKg').valid).toBe(false);
  });
});
