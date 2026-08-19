/**
 * History route — FR12: an authenticated user can view their own past
 * calculations (never anyone else's; that's what reports, FR13/FR14,
 * are for, and those are admin-only).
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');

function createHistoryRouter(db) {
  const router = express.Router();

  router.get('/', requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `SELECT id, category, calc_type AS calcType, result, created_at AS createdAt
         FROM calculations
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .all(req.user.id);

    return res.json({ history: rows });
  });

  return router;
}

module.exports = { createHistoryRouter };
