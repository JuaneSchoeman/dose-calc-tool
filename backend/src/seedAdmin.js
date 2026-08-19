/**
 * FR15 — Seeds a single administrator account at start-up from
 * environment variables, if no admin account already exists.
 *
 * Deliberately never overwrites an existing admin's password on
 * restart — it only creates one if none is present, so changing
 * ADMIN_PASSWORD in .env after first run has no unexpected effect.
 */

const { hashPassword } = require('./auth');

async function seedAdmin(db) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existingAdmin) {
    return { created: false, reason: 'Admin account already exists.' };
  }

  if (!email || !password) {
    console.warn(
      'No admin account exists and ADMIN_EMAIL/ADMIN_PASSWORD are not set. ' +
        'Set them in your .env file and restart the server to create one.'
    );
    return { created: false, reason: 'ADMIN_EMAIL/ADMIN_PASSWORD not set.' };
  }

  const passwordHash = await hashPassword(password);
  db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(
    email,
    passwordHash,
    'admin'
  );

  console.log(`Admin account created for ${email}.`);
  return { created: true };
}

module.exports = { seedAdmin };
