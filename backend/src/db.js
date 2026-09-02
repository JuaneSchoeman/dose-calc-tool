// src/db.js
// Sets up the SQLite database, creates the schema, and seeds the initial
// administrator account (FR15) from environment variables at first start-up.

const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

// backend/data/dosecalc.db - data/ sits alongside src/, not inside it.
const DB_PATH = path.join(__dirname, '..', 'data', 'dosecalc.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema -----------------------------------------------------------
// users: login is by professional identifying number (e.g. SANC number for
// nurses, SAPC registration number for pharmacists) rather than email.
// Email is stored only as an optional extra field (e.g. for a future
// password-reset flow) - it is never required and never used to log in.
// Still no patient data is stored anywhere (NFR5, NFR8).
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier_number TEXT UNIQUE NOT NULL,
  email             TEXT,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('standard', 'administrator')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// calculations: immutable audit record (NFR10) - no UPDATE/DELETE routes are
// ever exposed for this table. Stores only user id, category, result and a
// timestamp - no patient-identifiable information (NFR5, FR10).
// dose_unit is the plain mass unit for the computed total_dose (e.g. "mg") -
// a total amount is never itself "per kg" or "per m2", so it's stored and
// displayed without that suffix. dose_rate_label is the separate, full
// prescribing-rate label (e.g. "mg/m2") that pairs with dose_per_unit, kept
// so the original prescribed rate remains visible in the audit trail.
db.exec(`
CREATE TABLE IF NOT EXISTS calculations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  category        TEXT NOT NULL,
  calc_type       TEXT NOT NULL CHECK (calc_type IN ('weight', 'bsa')),
  weight_kg       REAL,
  height_cm       REAL,
  bsa_m2          REAL,
  dose_per_unit   REAL NOT NULL,
  dose_rate_label TEXT,
  total_dose      REAL NOT NULL,
  dose_unit       TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Migration guard: a database created before dose_rate_label existed won't
// have the column yet. ALTER TABLE ADD COLUMN is safe to run repeatedly
// once guarded like this, and leaves existing rows' dose_rate_label as
// NULL rather than losing any data.
const calculationColumns = db.prepare('PRAGMA table_info(calculations)').all();
if (!calculationColumns.some((col) => col.name === 'dose_rate_label')) {
  db.exec('ALTER TABLE calculations ADD COLUMN dose_rate_label TEXT;');
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_calc_user ON calculations(user_id);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_calc_category ON calculations(category);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_calc_created ON calculations(created_at);`);

// --- FR15: seed initial administrator account --------------------------
function seedAdmin() {
  const identifierNumber = process.env.ADMIN_IDENTIFIER_NUMBER;
  const email = process.env.ADMIN_EMAIL || null; // optional
  const password = process.env.ADMIN_PASSWORD;

  if (!identifierNumber || !password) {
    console.warn(
      '[db] ADMIN_IDENTIFIER_NUMBER / ADMIN_PASSWORD not set - skipping admin seed. ' +
      'Set these in backend/.env to create the first administrator account.'
    );
    return;
  }

  const existingAdmin = db
    .prepare('SELECT id FROM users WHERE role = ?')
    .get('administrator');

  if (existingAdmin) return; // FR15: only seed if none exists

  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    'INSERT INTO users (identifier_number, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(identifierNumber.trim(), email ? email.toLowerCase().trim() : null, hash, 'administrator');

  console.log(`[db] Seeded initial administrator account (identifier: ${identifierNumber})`);
}

seedAdmin();

module.exports = db;
