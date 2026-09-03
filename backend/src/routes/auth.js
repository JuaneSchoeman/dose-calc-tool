// routes/auth.js
// FR1: Register user account
// FR2: Authenticate user (login) / logout
//
// Login credential is a professional identifying number (e.g. SANC
// registration number for nurses, SAPC registration number for
// pharmacists) rather than an email address. Email is stored only as an
// optional extra field and is never used for authentication.

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Alphanumeric, optionally with hyphens/slashes, 4-20 characters - loose
// enough to cover both SANC (numeric) and SAPC (alphanumeric) formats.
const IDENTIFIER_RE = /^[A-Za-z0-9/-]{4,20}$/;

// POST /auth/register  (FR1)
router.post('/register', async (req, res, next) => {
  try {
    const { identifierNumber, email, password, confirmPassword } = req.body;

    if (!identifierNumber || !IDENTIFIER_RE.test(identifierNumber.trim())) {
      return res.status(400).json({
        error: 'Please provide a valid identifying number (4-20 letters, digits, "-" or "/").',
      });
    }
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address, or leave it blank.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const normalisedIdentifier = identifierNumber.trim();
    const normalisedEmail = email ? email.toLowerCase().trim() : null;

    const existing = await db.get(
      'SELECT id FROM users WHERE identifier_number = ?',
      [normalisedIdentifier]
    );
    if (existing) {
      return res.status(409).json({ error: 'An account with that identifying number already exists.' });
    }

    const hash = bcrypt.hashSync(password, 12); // NFR8
    const info = await db.run(
      'INSERT INTO users (identifier_number, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [normalisedIdentifier, normalisedEmail, hash, 'standard']
    );

    return res.status(201).json({
      message: 'Account created. You can now log in.',
      userId: info.lastInsertRowid,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /auth/login  (FR2)
router.post('/login', async (req, res, next) => {
  try {
    const { identifierNumber, password } = req.body;

    if (!identifierNumber || !password) {
      return res.status(400).json({ error: 'Identifying number and password are required.' });
    }

    const user = await db.get(
      'SELECT * FROM users WHERE identifier_number = ?',
      [String(identifierNumber).trim()]
    );

    const passwordOk = user && bcrypt.compareSync(password, user.password_hash);

    if (!passwordOk) {
      // Deliberately generic message - do not reveal whether the identifier exists.
      return res.status(401).json({ error: 'Invalid identifying number or password.' });
    }

    req.session.user = {
      id: user.id,
      identifierNumber: user.identifier_number,
      email: user.email,
      role: user.role,
    };
    return res.json({ message: 'Logged in.', user: req.session.user });
  } catch (err) {
    return next(err);
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
});

// GET /auth/me - current session info, used by the frontend to render UI state
router.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

module.exports = router;
