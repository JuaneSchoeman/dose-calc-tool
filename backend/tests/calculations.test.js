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

describe('BSA-based dose (FR6)', () => {
  test('70 kg, 170 cm, 100 mg/m^2 -> 181.81 mg', () => {
    const { bsa, totalDose } = calc.calculateBsaDose(70, 170, 100);
    expect(bsa).toBeCloseTo(1.8181, 2);
    expect(totalDose).toBeCloseTo(181.81, 1);
  });

  test('returns a three-step breakdown (FR9)', () => {
    const { steps } = calc.calculateBsaDose(70, 170, 100);
    expect(steps).toHaveLength(3);
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

  test('rejects non-numeric input', () => {
    expect(calc.validateNumber('abc', 'weightKg').valid).toBe(false);
    expect(calc.validateNumber('', 'weightKg').valid).toBe(false);
  });
});
