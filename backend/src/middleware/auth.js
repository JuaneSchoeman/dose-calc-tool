/**
 * Express middleware for authentication and authorization.
 *
 * requireAuth: verifies the JWT on protected routes and implements the
 * NFR9 sliding-expiry behaviour — a valid request refreshes the token
 * for another 15 minutes, so active use never logs a user out, but 15
 * minutes of inactivity does.
 *
 * requireAdmin: restricts a route to administrator accounts (FR13, FR14).
 */

const { verifyToken, issueToken } = require('../auth');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ errors: ['Authentication required. Please log in.'] });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId, email: payload.email, role: payload.role };

    // NFR9 — sliding expiry: issue a fresh token on every authenticated
    // request so the session only expires after inactivity, not on a
    // fixed clock regardless of use.
    const refreshedToken = issueToken({ id: payload.userId, email: payload.email, role: payload.role });
    res.setHeader('X-Refreshed-Token', refreshedToken);

    return next();
  } catch (err) {
    return res.status(401).json({ errors: ['Session expired. Please log in again.'] });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ errors: ['Administrator access required.'] });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
