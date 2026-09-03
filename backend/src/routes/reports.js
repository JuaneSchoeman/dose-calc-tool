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

// GET /reports/users - list of registered users, for filter dropdowns
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const rows = await db.all('SELECT identifier_number FROM users ORDER BY identifier_number');
    res.json({ users: rows.map((r) => r.identifier_number) });
  } catch (err) {
    next(err);
  }
});

// GET /reports/detailed?from&to&identifierNumber?&category?&calcType?
// A filterable, per-calculation report (not just aggregate counts) that can
// be scoped to a specific user, clinical department/category, and/or
// calculation type - in addition to the required date range. Intended to be
// printed as a targeted record (e.g. "all of nurse X's calculations this
// month", or "all Oncology BSA calculations last quarter").
router.get('/detailed', requireAdmin, async (req, res, next) => {
  try {
    const range = parseDateRange(req, res);
    if (!range) return;

    const { identifierNumber, category, calcType } = req.query;

    const conditions = ['c.created_at BETWEEN ? AND ?'];
    const params = [range.from, range.to];

    if (identifierNumber) {
      conditions.push('u.identifier_number = ?');
      params.push(identifierNumber);
    }
    if (category) {
      conditions.push('c.category = ?');
      params.push(category);
    }
    if (calcType) {
      if (!['weight', 'bsa'].includes(calcType)) {
        return res.status(400).json({ error: 'calcType must be "weight" or "bsa".' });
      }
      conditions.push('c.calc_type = ?');
      params.push(calcType);
    }

    const rows = await db.all(
      `SELECT c.id, c.created_at, u.identifier_number, c.category, c.calc_type,
              c.weight_kg, c.height_cm, c.bsa_m2, c.dose_per_unit, c.dose_rate_label, c.total_dose, c.dose_unit, c.drug_name
       FROM calculations c
       JOIN users u ON u.id = c.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.created_at DESC`,
      params
    );

    res.json({
      from: req.query.from,
      to: req.query.to,
      filters: {
        identifierNumber: identifierNumber || null,
        category: category || null,
        calcType: calcType || null,
      },
      report: rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /reports/by-category?from=YYYY-MM-DD&to=YYYY-MM-DD  (FR13)
router.get('/by-category', requireAdmin, async (req, res, next) => {
  try {
    const range = parseDateRange(req, res);
    if (!range) return;

    const rows = await db.all(
      `SELECT category, COUNT(*) AS calculation_count
       FROM calculations
       WHERE created_at BETWEEN ? AND ?
       GROUP BY category
       ORDER BY calculation_count DESC`,
      [range.from, range.to]
    );

    res.json({ from: req.query.from, to: req.query.to, report: rows });
  } catch (err) {
    next(err);
  }
});

// GET /reports/by-user?from=YYYY-MM-DD&to=YYYY-MM-DD  (FR14)
router.get('/by-user', requireAdmin, async (req, res, next) => {
  try {
    const range = parseDateRange(req, res);
    if (!range) return;

    const rows = await db.all(
      `SELECT u.identifier_number AS user_identifier, COUNT(c.id) AS calculation_count
       FROM calculations c
       JOIN users u ON u.id = c.user_id
       WHERE c.created_at BETWEEN ? AND ?
       GROUP BY c.user_id
       ORDER BY calculation_count DESC`,
      [range.from, range.to]
    );

    res.json({ from: req.query.from, to: req.query.to, report: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
