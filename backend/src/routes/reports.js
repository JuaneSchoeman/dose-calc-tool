/**
 * Reporting routes — FR13 (usage by category per time period) and
 * FR14 (usage by user per time period). Both are restricted to
 * administrator accounts (requireAdmin), since they reveal aggregate
 * activity across all users, not just the requester's own data.
 *
 * Date range is supplied as ?start=YYYY-MM-DD&end=YYYY-MM-DD. If
 * omitted, the report covers all recorded history.
 */

const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function parseDateRange(query) {
  const start = query.start ? `${query.start} 00:00:00` : '0000-01-01 00:00:00';
  const end = query.end ? `${query.end} 23:59:59` : '9999-12-31 23:59:59';
  return { start, end };
}

function createReportsRouter(db) {
  const router = express.Router();

  // FR13 — usage report grouped by clinical category
  router.get('/by-category', requireAuth, requireAdmin, (req, res) => {
    const { start, end } = parseDateRange(req.query);

    const rows = db
      .prepare(
        `SELECT category, COUNT(*) AS count
         FROM calculations
         WHERE created_at BETWEEN ? AND ?
         GROUP BY category
         ORDER BY count DESC`
      )
      .all(start, end);

    return res.json({ report: rows, range: { start: req.query.start || null, end: req.query.end || null } });
  });

  // FR14 — usage report grouped by user
  router.get('/by-user', requireAuth, requireAdmin, (req, res) => {
    const { start, end } = parseDateRange(req.query);

    const rows = db
      .prepare(
        `SELECT u.email, COUNT(c.id) AS count
         FROM calculations c
         JOIN users u ON u.id = c.user_id
         WHERE c.created_at BETWEEN ? AND ?
         GROUP BY u.email
         ORDER BY count DESC`
      )
      .all(start, end);

    return res.json({ report: rows, range: { start: req.query.start || null, end: req.query.end || null } });
  });

  return router;
}

module.exports = { createReportsRouter };
