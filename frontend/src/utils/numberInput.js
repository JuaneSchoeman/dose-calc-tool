// src/utils/numberInput.js
//
// All numeric fields in this app (weight, height, dose, converter values)
// use type="text" with inputMode="decimal" rather than type="number".
// type="number" brings along the browser's native spin-box arrows, and -
// more importantly - lets a mouse-wheel scroll over a *focused* field
// silently increment/decrement the value instead of scrolling the page.
// There's no reliable, cross-browser way to keep type="number" and fully
// suppress that (it's a native default action, not something a wheel
// listener can consistently outrun), so the field is a text input instead:
// it still shows the numeric keypad on mobile (inputMode="decimal") and
// still produces a value the existing string-based validation/calculation
// calls can parse with Number(...), but it never spins and never reacts to
// scrolling.
//
// This helper keeps what the user types restricted to a valid decimal
// number as they type, without needing a browser-native input type to
// enforce it.

/**
 * Strip a freely-typed string down to something that looks like a decimal
 * number: digits and at most one decimal point. Everything else (letters,
 * extra dots, symbols) is dropped as it's typed.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeDecimalInput(raw) {
  if (raw === '') return '';
  let cleaned = raw.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}
