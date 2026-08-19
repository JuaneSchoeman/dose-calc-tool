/**
 * Authentication routes — FR1 (register) and FR2 (login).
 *
 * Registration always creates a 'user' role account. Administrator
 * accounts are never created through this public endpoint — the only
 * way to obtain one is the FR15 seeding process at server start-up.
 * This is a deliberate security decision: letting a client-supplied
 * 'role' field control privilege would let anyone register as admin.
 */

const express = require('express');
const { hashPassword, verifyPassword, issueToken } = require('../auth');

function createAuthRouter(db) {
  const router = express.Router();

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ errors: ['A valid email address is required.'] });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ errors: ['Password must be at least 8 characters long.'] });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ errors: ['An account with this email already exists.'] });
    }

    const passwordHash = await hashPassword(password);
    const info = db
      .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
      .run(email, passwordHash, 'user');

    const user = { id: info.lastInsertRowid, email, role: 'user' };
    const token = issueToken(user);

    return res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ errors: ['Email and password are required.'] });
    }

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Deliberately generic error message — does not reveal whether the
    // email exists, to avoid leaking account information.
    const invalidCredentials = () =>
      res.status(401).json({ errors: ['Invalid email or password.'] });

    if (!row) return invalidCredentials();

    const passwordMatches = await verifyPassword(password, row.password_hash);
    if (!passwordMatches) return invalidCredentials();

    const user = { id: row.id, email: row.email, role: row.role };
    const token = issueToken(user);

    return res.json({ token, user });
  });

  return router;
}

module.exports = { createAuthRouter };
