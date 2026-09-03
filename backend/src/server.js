// src/server.js
// Entry point. Wires up sessions (NFR9), CORS (for local dev, where the
// frontend runs on a separate Vite dev server / origin), and API routes.
//
// In production this same app can also serve the built frontend
// (frontend/dist) directly, so the whole thing - API and UI - is reachable
// from a single URL/port. That's entirely optional: if frontend/dist
// doesn't exist (e.g. plain `npm start` in local dev without running
// `npm run build` first), this server just runs as an API only, exactly as
// before, and you point a separately-running Vite dev server at it.

const path = require('path');
const fs = require('fs');
require('dotenv').config({ quiet: true });
const express = require('express');
const session = require('express-session');
const cors = require('cors');

require('./db'); // ensures schema + admin seed (FR15) run on start-up

const authRoutes = require('./routes/auth');
const calcRoutes = require('./routes/calc');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // NFR9: 15 minutes of inactivity
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Render/Railway/Fly/etc sit behind a reverse proxy that terminates TLS -
// without this, Express can't tell the original request was HTTPS, and the
// secure cookie below would never get sent back by the browser.
app.set('trust proxy', 1);

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true, // required so the session cookie is sent cross-origin
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-.env',
    resave: false,
    saveUninitialized: false,
    rolling: true, // NFR9: sliding expiry, refreshed on each request
    cookie: {
      maxAge: SESSION_TIMEOUT_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PRODUCTION, // requires HTTPS - true on every mainstream host
    },
  })
);

// --- API routes ----------------------------------------------------------
// Mounted under /api so they can never collide with the frontend's own
// client-side routes (e.g. the "/reports" *page* vs an API route of the
// same name) when both are served from one origin in production.
app.use('/api/auth', authRoutes);
app.use('/api/calc', calcRoutes);
app.use('/api/reports', reportRoutes);

// NFR12: never fail silently - any unmatched /api/* request gets a clear
// JSON error rather than falling through to the frontend's HTML below.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// --- Serve the built frontend, if present --------------------------------
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback: any other GET (e.g. a browser refresh on /history) should
  // return the app shell and let React Router take over client-side.
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`Dose-calculation server running at http://localhost:${PORT}`);
  if (fs.existsSync(frontendDist)) {
    console.log('Serving the built frontend from frontend/dist alongside the API.');
  } else {
    console.log(`API only (no frontend/dist found) - accepting requests from: ${CLIENT_ORIGIN}`);
  }
});
