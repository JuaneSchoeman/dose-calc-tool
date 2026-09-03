# Dose-Calc-Tool - ITRI671 Empirical Study Artefact

A web-based tool that calculates **weight-based** and **body-surface-area
(BSA)-based** medication doses, converts units (kg/lb, cm/inch), shows a
step-by-step breakdown of every calculation, and keeps an immutable audit
history. Administrators can generate usage reports by clinical category and
by user. This implements FR1-FR15 and NFR1-NFR15 from Chapter 4 of the
empirical study document.

The project is split into two independent services:

```
dose-calc-tool/
  backend/     Express + SQLite API (port 3000)
  frontend/    React + Vite single-page app (port 5173)
```

They talk to each other over HTTP with CORS + session cookies - run them in
two separate terminals.

## Quick start

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set SESSION_SECRET, ADMIN_IDENTIFIER_NUMBER, ADMIN_PASSWORD
npm start
```

The first start-up seeds one administrator account from
`ADMIN_IDENTIFIER_NUMBER` / `ADMIN_PASSWORD` (FR15). The API listens on
`http://localhost:3000`.

**Login credential:** users log in with a professional identifying number
(e.g. a SANC registration number for nurses, or a SAPC registration number
for pharmacists) rather than an email address. Email is stored only as an
optional extra field and is never used to authenticate.

**2. Frontend** (separate terminal)

```bash
cd frontend
npm install
cp .env.example .env.local   # only needed if the API isn't on localhost:3000
npm run dev
```

Open `http://localhost:5173`. Register a standard account from there, or log
in as the seeded administrator.

**3. Backend tests**

```bash
cd backend
npm test
```

Runs the Jest suite in `backend/tests/calculations.test.js` - the same kind
of manually-verified test cases described in the empirical study's
evaluation section (NFR4, ±0.01 accuracy).

## Requirement traceability

| Area | Requirement IDs | Backend | Frontend |
| --- | --- | --- | --- |
| Registration / login (by professional identifying number, email optional) | FR1, FR2 | `src/routes/auth.js` | `src/pages/LoginPage.jsx`, `RegisterPage.jsx`, `src/context/AuthContext.jsx` |
| Category selection | FR3 | `src/routes/calc.js` (`CATEGORIES`) | `src/DoseCalculator.jsx` |
| Unit selection & conversion | FR4 | `src/calculations.js` | `src/DoseCalculator.jsx` |
| BSA calculation (Mosteller) | FR5 | `src/calculations.js` (`calculateBSA`) | result display in `DoseCalculator.jsx` |
| BSA-based dose | FR6 | `calculateBsaDose` | - |
| Weight-based dose | FR7 | `calculateWeightDose` | - |
| Input validation | FR8 | `validateNumber`, `POST /calc/validate` | real-time field validation in `DoseCalculator.jsx`, `RegisterPage.jsx` |
| Step-by-step breakdown | FR9 | `steps` array returned by calc functions | rendered as `<ol class="calc-steps">` |
| Audit record storage | FR10 | `POST /calc/calculate` inserts into `calculations` table | - |
| Reset/clear inputs | FR11 | - | "Reset" button in `DoseCalculator.jsx` |
| Personal history | FR12 | `GET /calc/history` | `src/pages/HistoryPage.jsx` |
| Usage report by category | FR13 | `GET /reports/by-category` | `src/pages/ReportsPage.jsx` |
| Usage report by user | FR14 | `GET /reports/by-user` | `src/pages/ReportsPage.jsx` |
| Admin seeding | FR15 | `src/db.js` (`seedAdmin`) | - |
| Session timeout (15 min) | NFR9 | `src/server.js` (`SESSION_TIMEOUT_MS`, `rolling: true`) | session re-checked via `/auth/me` |
| Password hashing | NFR8 | `bcryptjs`, cost factor 12 | - |
| No patient data stored | NFR5 | schema in `src/db.js` stores only email, hash, role, calculation numbers | - |
| Immutable history | NFR10 | no UPDATE/DELETE route exposed for `calculations` | history table is read-only |
| Separable calculation module | NFR14 | `src/calculations.js` has no DB/framework dependency | - |
| Accuracy (±0.01) | NFR4 | verified in `tests/calculations.test.js` | - |
| Role-based access | - | `src/routes/middleware.js` (`requireLogin`, `requireAdmin`) | `src/ProtectedRoute.jsx` |

## UI design guideline compliance

Per `User Interface Design Guidelines.pptx`:

- Labels sit **above** each field; forms flow top-to-bottom (`components.css`).
- The calculator is broken into **steps with a progress indicator**
  (category/type -> measurements -> result) instead of one long form
  (`DoseCalculator.jsx`).
- Radio buttons (calculation type, weight/height unit) are **stacked
  vertically**; two-option unit choices use a compact inline variant where
  space is limited. The category list (6 options) uses a dropdown.
- **Real-time validation** runs as the user types (debounced), with inline
  error text under each field - not just on submit.
- The height field is **hidden/revealed** based on the selected calculation
  type, keeping the form visually minimal.
- Design tokens (`tokens.css`) and shared component styles
  (`components.css`) are defined once and reused across every page for
  visual consistency.
- Required fields are marked with a `*`.
- Colour palette is deliberately restrained (soft blues/greens, no flashing
  elements or heavy animation).
- History and report tables are clearly labelled and **sortable by column**
  (NFR13).

## Project structure

```
backend/
  src/
    server.js            Express app entry point, CORS + session config
    db.js                 SQLite schema + admin seeding (FR15)
    calculations.js       Separable calculation module (NFR14)
    routes/
      auth.js               FR1, FR2
      calc.js               FR3-FR9, FR10, FR12
      reports.js            FR13, FR14
      middleware.js         session guards
  tests/
    calculations.test.js  Jest unit tests (NFR4 accuracy evidence)
  data/                  SQLite database file lives here (gitignored)

frontend/
  src/
    context/
      AuthContext.jsx      session state, login/register/logout
    pages/
      LoginPage.jsx, RegisterPage.jsx, CalculatorPage.jsx,
      HistoryPage.jsx, ReportsPage.jsx
    DoseCalculator.jsx     the multi-step calculator (FR3-FR9, FR11)
    NavBar.jsx             shared navigation
    ProtectedRoute.jsx     route guard (login / admin-only)
    api.js                 fetch wrapper (credentials: 'include')
    App.jsx                route table
    main.jsx                app entry point
    tokens.css, components.css, App.css, index.css
```

## Deployment

In production, the backend serves the built frontend itself, so the whole
app - UI and API - lives at **one URL**. The API is namespaced under `/api`
specifically so it can never collide with the frontend's own page routes
(e.g. the `/reports` *page* vs an API route of the same name) once both are
served from the same origin.

Steps, using [Render](https://render.com) as an example (Railway and Fly.io
work the same way in principle):

1. Push this project to a GitHub repo.
2. Create a new **Web Service** on Render, pointing at that repo.
3. Set:
   - **Root Directory**: the folder containing this README (leave blank if
     it's the repo root)
   - **Build Command**: `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend`
   - **Start Command**: `npm start --prefix backend`
4. Add environment variables (Render → your service → Environment):
   - `NODE_ENV=production`
   - `SESSION_SECRET` - a long random string
   - `ADMIN_IDENTIFIER_NUMBER`, `ADMIN_PASSWORD` (and optionally `ADMIN_EMAIL`)
   - `CLIENT_ORIGIN` - can be left as-is; it's only used for CORS, which
     isn't exercised once the frontend is served from the same origin
5. Deploy. Render gives you a URL like `https://your-app.onrender.com` -
   that's the one link for the whole app.

**A note on the database:** this app uses a local SQLite file
(`backend/data/dosecalc.db`). Most free-tier hosting plans use an
**ephemeral filesystem** - the file (and everything in it) is wiped on every
redeploy or restart. That's fine for demoing the artefact, but if you need
data to persist:

- Render: add a paid [persistent Disk](https://render.com/docs/disks)
  mounted at `backend/data`.
- Railway / Fly.io: attach a persistent volume the same way.
- Alternatively, swap SQLite for a hosted database (e.g. Postgres) - a
  larger change, not needed just to get a working link.

Running two separate services (frontend as a static site, backend as a
separate API service) also still works with no code changes - just set
`VITE_API_URL` at frontend build time to the backend's URL, and
`CLIENT_ORIGIN` on the backend to the frontend's URL. The single-service
approach above is simpler and avoids a subtlety with session cookies across
two different `*.onrender.com`-style subdomains, so it's the recommended
default.

## Suggested next steps

- Add a small Playwright/Cypress suite covering the registration -> login ->
  calculate -> history flow end-to-end through the browser.
- Wrap the AI-assisted verification transcripts (mathematical + usability)
  as an appendix, per Section 2.7 of the methodology.
