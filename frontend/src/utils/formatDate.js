// src/utils/formatDate.js
// Formats timestamps for display in South African local time
// (Africa/Johannesburg, UTC+2, no daylight saving) as "yyyy/mm/dd hh:mm:ss".
//
// The backend stores `created_at` using SQLite's datetime('now'), which
// returns UTC as "YYYY-MM-DD HH:MM:SS" - a space instead of "T" and no
// trailing "Z". Passed directly to `new Date(...)`, that string is parsed
// inconsistently across browsers (some treat it as UTC, some as local
// time), so it's normalised to a proper ISO 8601 UTC string first.

const SA_TIME_ZONE = 'Africa/Johannesburg';

/**
 * @param {string|Date|null|undefined} timestamp - a SQLite
 *   "YYYY-MM-DD HH:MM:SS" UTC string, an ISO string, or a Date.
 * @returns {string} "yyyy/mm/dd hh:mm:ss" in South African local time, or
 *   '' if timestamp is missing/unparseable.
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : new Date(normaliseToIso(timestamp));

  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23', // avoids the "24:00:00" quirk some engines produce with hour12: false
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';

  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function normaliseToIso(value) {
  // Already ISO-ish (has a "T" separator, e.g. from Date#toISOString()) -
  // leave it alone.
  if (value.includes('T')) return value;
  // SQLite's "YYYY-MM-DD HH:MM:SS" is UTC but carries no timezone marker -
  // add one so `new Date(...)` parses it as UTC everywhere.
  return `${value.replace(' ', 'T')}Z`;
}
