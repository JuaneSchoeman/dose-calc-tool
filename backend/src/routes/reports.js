// routes/reports.js
// FR13: Generate usage report by category per time period
// FR14: Generate usage report by user per time period
// NFR11: reports must return within 3 seconds for date ranges up to 12 months
//        (indexes on category/created_at/user_id in db.js support this)

const express = require('express');
const db = require('../db');
const { requireAdmin } = require('./middleware');

const router = express.Router();

function parseDateRange(req, res) {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'Both "from" and "to" query dates are required (YYYY-MM-DD).' });
    return null;
  }
  return { from: `${from} 00:00:00`, to: `${to} 23:59:59` };
}

// GET /reports/by-category?from=YYYY-MM-DD&to=YYYY-MM-DD  (FR13)
router.get('/by-category', requireAdmin, (req, res) => {
  const range = parseDateRange(req, res);
  if (!range) return;

  const rows = db
    .prepare(
      `SELECT category, COUNT(*) AS calculation_count
       FROM calculations
       WHERE created_at BETWEEN ? AND ?
       GROUP BY category
       ORDER BY calculation_count DESC`
    )
    .all(range.from, range.to);

  res.json({ from: req.query.from, to: req.query.to, report: rows });
});

// GET /reports/by-user?from=YYYY-MM-DD&to=YYYY-MM-DD  (FR14)
router.get('/by-user', requireAdmin, (req, res) => {
  const range = parseDateRange(req, res);
  if (!range) return;

  const rows = db
    .prepare(
      `SELECT u.identifier_number AS user_identifier, COUNT(c.id) AS calculation_count
       FROM calculations c
       JOIN users u ON u.id = c.user_id
       WHERE c.created_at BETWEEN ? AND ?
       GROUP BY c.user_id
       ORDER BY calculation_count DESC`
    )
    .all(range.from, range.to);

  res.json({ from: req.query.from, to: req.query.to, report: rows });
});

module.exports = router;
