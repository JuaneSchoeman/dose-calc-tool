require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { createDb } = require('./db');
const { seedAdmin } = require('./seedAdmin');
const { createAuthRouter } = require('./routes/auth');
const { createCalculateRouter } = require('./routes/calculate');
const { createHistoryRouter } = require('./routes/history');
const { createReportsRouter } = require('./routes/reports');

/**
 * Builds the Express app. Accepts an optional dbPath override so tests
 * can pass ':memory:' instead of writing to the real database file.
 */
function createApp(dbPath) {
  const db = createDb(dbPath);
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Expose the sliding-expiry refreshed token (NFR9) to browser clients.
  app.use(cors({ exposedHeaders: ['X-Refreshed-Token'] }));

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/calculate', createCalculateRouter(db));
  app.use('/api/history', createHistoryRouter(db));
  app.use('/api/reports', createReportsRouter(db));

  // NFR12 — clear error rather than failing silently on unexpected errors
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ errors: ['An unexpected error occurred. Please try again.'] });
  });

  return { app, db };
}

if (require.main === module) {
  const { app, db } = createApp();
  seedAdmin(db).catch((err) => console.error('Failed to seed admin account:', err));

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Dose calculation API listening on port ${PORT}`);
  });
}

module.exports = { createApp };
