/**
 * Database layer — creates/opens the SQLite database and defines the
 * schema for users (FR1, FR15) and calculation history (FR10).
 *
 * Uses better-sqlite3, a synchronous SQLite driver well suited to a
 * project of this scale (NFR6 — no separate database server required).
 *
 * DB_PATH can be overridden via environment variable, primarily so
 * tests can use an in-memory database (':memory:') instead of writing
 * to disk.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function createDb(dbPath) {
  const resolvedPath = dbPath || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dose_calc.db');

  // Ensure the data directory exists (skip for in-memory databases)
  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // NFR10 — calculation history is append-only (no UPDATE/DELETE ever
  // issued against this table by the application layer).
  db.exec(`
    CREATE TABLE IF NOT EXISTS calculations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL,
      calc_type TEXT NOT NULL CHECK (calc_type IN ('weight-based', 'bsa-based')),
      result REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

module.exports = { createDb };
