# Dose Calculation Tool

Implements all functional and non-functional requirements (FR1–FR15,
NFR1–NFR14) across the three planned development cycles:

- **Cycle 1 — Core calculation engine:** FR4–FR9
- **Cycle 2 — Accounts and categories:** FR1–FR3, FR15
- **Cycle 3 — History and reporting:** FR10–FR14

## Structure

```
dose-calc-tool/
  backend/
    src/
      calculations.js      FR5-FR7, FR9 — pure calculation logic (no HTTP/DB)
      validation.js         FR8 + Table 4.2 input ranges
      db.js                 SQLite schema — users, calculations
      auth.js                bcrypt hashing (NFR8) + JWT issuing (NFR9)
      seedAdmin.js            FR15 — seeds one admin account from .env
      middleware/auth.js      requireAuth (sliding expiry) + requireAdmin
      routes/
        auth.js               FR1 register, FR2 login
        calculate.js           FR3-FR9 calculation endpoints + FR10 persistence
        history.js              FR12 — personal history
        reports.js               FR13 by-category, FR14 by-user (admin only)
      server.js                wires everything together
    tests/
      calculations.test.js    21 tests — pure calculation logic
      api.test.js              15 tests — full authenticated API, in-memory DB
    .env.example
  frontend/
    src/
      context/AuthContext.jsx   token/session state, sliding-refresh handling
      pages/
        LoginRegister.jsx        FR1, FR2
        Calculator.jsx            FR3-FR9, FR11
        History.jsx                FR12
        Reports.jsx                 FR13, FR14 (admin only)
      App.jsx                    navigation + auth gate
```

## First-time setup

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
```
Then open `.env` and set:
- `JWT_SECRET` — any long random string (a suggested command to generate one is in the file)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for the one seeded admin account (FR15)

```bash
npm test              # 36 tests total
node src/server.js    # starts API on http://localhost:4000
```

The first time it starts, it prints "Admin account created for <email>." —
that account is your only way into the Reports screen (FR13/FR14).

**Frontend** (second terminal):
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## What's implemented and verified

- Registration always creates a `user`-role account — the public endpoint
  cannot be used to create an admin, even if `role` is included in the
  request body. Only the `.env`-seeded account (FR15) is an admin.
- Sessions expire after 15 minutes of inactivity (NFR9): every authenticated
  request returns a refreshed token in the `X-Refreshed-Token` header, and
  the frontend stores it automatically. Stop making requests for 15 minutes
  and the next one returns 401, logging the user out.
- Calculation history is append-only — there is no update or delete route
  for the `calculations` table anywhere in the codebase (NFR10).
- A user can only ever see their own history (FR12); only admin accounts can
  see aggregate reports across all users (FR13/FR14).
- Passwords are hashed with bcrypt, cost factor 10 (NFR8) — verified by the
  register/login tests, which never assert against a plaintext password.

## A note on the test-case table

Test case 3 in the original documentation table (70 kg, 170 cm, 100 mg/m²)
was hand-calculated from a BSA already rounded to 1.81 m², giving an
expected dose of 181 mg. The artefact calculates from full floating-point
precision, giving 181.81 mg. Table 4.2/4.4 in the documentation should be
corrected to match — see `backend/tests/calculations.test.js` for the fix
and rationale.

## Suggested next steps (beyond the current FR/NFR scope)

- Frontend form validation matching Table 4.2 ranges client-side (currently
  only enforced server-side — functionally correct per FR8, but a nicer UX
  would flag errors before submission)
- A "confirm password" field on registration
- Deployment to Render/Railway per your Section 4.4 platform decision
