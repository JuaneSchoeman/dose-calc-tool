// src/server.js
// Entry point. Wires up sessions (NFR9), CORS (frontend runs on a separate
// Vite dev server / origin), and API routes.

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
      // secure: true, // enable once served over HTTPS in production
    },
  })
);

// --- API routes ---------------------------------------------------------
app.use('/auth', authRoutes);
app.use('/calc', calcRoutes);
app.use('/reports', reportRoutes);

// --- NFR12: never fail silently - always return a clear error message --
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`Dose-calculation API running at http://localhost:${PORT}`);
  console.log(`Accepting requests from client origin: ${CLIENT_ORIGIN}`);
});
