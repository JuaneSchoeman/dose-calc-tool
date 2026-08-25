// routes/middleware.js
// Session-based access control helpers.

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'You must be logged in to do that.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'You must be logged in to do that.' });
  }
  if (req.session.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
