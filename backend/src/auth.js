/**
 * Authentication utilities — password hashing (NFR8) and JWT issuing/
 * verification (NFR9, sliding 15-minute session expiry).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10; // NFR8 — bcrypt, cost factor 10
const TOKEN_EXPIRY = '15m'; // NFR9 — 15 minutes of inactivity

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  // Throws if invalid/expired — caller is responsible for catching.
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  hashPassword,
  verifyPassword,
  issueToken,
  verifyToken,
  TOKEN_EXPIRY,
};
