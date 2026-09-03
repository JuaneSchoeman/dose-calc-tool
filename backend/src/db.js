// src/db.js
// Connects to Turso (a hosted libSQL/SQLite-compatible database), creates
// the schema, and seeds the initial administrator account (FR15) from
// environment variables at first start-up.
//
// This used to run against a local SQLite file via better-sqlite3, which is
// synchronous. libSQL is a network client, so every call here is async -
// call sites elsewhere in the app now use `await db.get(...)` /
// `await db.all(...)` / `await db.run(...)` instead of
// `db.prepare(...).get()/.all()/.run()`.

const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.warn(
    '[db] TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are not set - the app will not ' +
    'be able to reach the database. Set both in backend/.env (see backend/.env.example).'
  );
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// --- Small convenience wrappers ------------------------------------------
// Keeps the call sites in routes/*.js reading almost the same as the old
// better-sqlite3 code, just with `await` in front and args passed as an
// array instead of chained .get()/.all()/.run() arguments.
async function get(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows[0]; // undefined if no row matched, same as better-sqlite3's .get()
}

async function all(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

async function run(sql, args = []) {
  const result = await client.execute({ sql, args });
  return {
    // lastInsertRowid comes back as a bigint from libSQL; better-sqlite3
    // returned a plain number, and callers below (and JSON responses to the
    // frontend) expect a plain number too, so convert here in one place.
    lastInsertRowid:
      result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
    rowsAffected: result.rowsAffected,
  };
}

// --- Schema ---------------------------------------------------------------
// users: login is by professional identifying number (e.g. SANC number for
// nurses, SAPC registration number for pharmacists) rather than email.
// Email is stored only as an optional extra field (e.g. for a future
// password-reset flow) - it is never required and never used to log in.
// Still no patient data is stored anywhere (NFR5, NFR8).
//
// calculations: immutable audit record (NFR10) - no UPDATE/DELETE routes are
// ever exposed for this table. Stores only user id, category, result and a
// timestamp - no patient-identifiable information (NFR5, FR10).
// dose_unit is the plain mass unit for the computed total_dose (e.g. "mg") -
// a total amount is never itself "per kg" or "per m2", so it's stored and
// displayed without that suffix. dose_rate_label is the separate, full
// prescribing-rate label (e.g. "mg/m2") that pairs with dose_per_unit, kept
// so the original prescribed rate remains visible in the audit trail.
// drug_name is an optional, free-text medication name (e.g. "Paracetamol")
// so the result can be shown/audited as e.g. "500 mg paracetamol" rather
// than a bare number - it is never required and plays no part in the
// calculation itself.
async function initSchema() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier_number TEXT UNIQUE NOT NULL,
      email             TEXT,
      password_hash     TEXT NOT NULL,
      role              TEXT NOT NULL CHECK (role IN ('standard', 'administrator')),
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
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
      drug_name       TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration guard: a database created before dose_rate_label/drug_name
  // existed won't have those columns yet. ALTER TABLE ADD COLUMN is safe to
  // run repeatedly once guarded like this, and leaves existing rows' new
  // columns as NULL rather than losing any data.
  const calculationColumns = await all('PRAGMA table_info(calculations)');
  if (!calculationColumns.some((col) => col.name === 'dose_rate_label')) {
    await client.execute('ALTER TABLE calculations ADD COLUMN dose_rate_label TEXT;');
  }
  if (!calculationColumns.some((col) => col.name === 'drug_name')) {
    await client.execute('ALTER TABLE calculations ADD COLUMN drug_name TEXT;');
  }

  await client.execute('CREATE INDEX IF NOT EXISTS idx_calc_user ON calculations(user_id);');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_calc_category ON calculations(category);');
  await client.execute('CREATE INDEX IF NOT EXISTS idx_calc_created ON calculations(created_at);');
}

// --- FR15: seed initial administrator account ------------------------------
async function seedAdmin() {
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

  const existingAdmin = await get('SELECT id FROM users WHERE role = ?', ['administrator']);

  if (existingAdmin) return; // FR15: only seed if none exists

  const hash = bcrypt.hashSync(password, 12);
  await run(
    'INSERT INTO users (identifier_number, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [identifierNumber.trim(), email ? email.toLowerCase().trim() : null, hash, 'administrator']
  );

  console.log(`[db] Seeded initial administrator account (identifier: ${identifierNumber})`);
}

// Runs schema creation + admin seeding exactly once. server.js awaits this
// before accepting requests, so every route can assume the schema already
// exists by the time it runs.
let initPromise = null;
function initDb() {
  if (!initPromise) {
    initPromise = initSchema().then(seedAdmin);
  }
  return initPromise;
}

module.exports = { client, get, all, run, initDb };
