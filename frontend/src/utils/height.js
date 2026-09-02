// src/utils/height.js
//
// Feet+inches is a compound measurement (two numbers, not one), so it's
// handled as a frontend-only input/display mode rather than a backend
// "unit": wherever a height is needed, feet+inches is converted to a single
// cm value here before it's sent anywhere, using the same 2.54 cm/inch and
// 30.48 cm/ft factors the backend's length converter already uses (see
// LENGTH_UNITS_TO_CM in calculations.js), so results match exactly no
// matter which input mode was used to reach that cm value.

/**
 * Combine feet and inches into a single cm value.
 * @param {number|string} feet
 * @param {number|string} inches
 * @returns {number}
 */
export function feetInchesToCm(feet, inches) {
  const f = Number(feet) || 0;
  const i = Number(inches) || 0;
  return f * 30.48 + i * 2.54;
}

/**
 * Split a cm value into whole feet and remaining inches, for display when
 * converting *to* feet+inches (e.g. the height converter's "to" side).
 * @param {number} cm
 * @returns {{ feet: number, inches: number }}
 */
export function cmToFeetInches(cm) {
  const totalInches = Number(cm) / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round((totalInches - feet * 12) * 100) / 100;
  // Rounding inches up to 12.0 should carry into an extra foot rather than
  // display as "5 ft 12 in".
  if (inches >= 12) {
    feet += 1;
    inches -= 12;
  }
  return { feet, inches };
}
