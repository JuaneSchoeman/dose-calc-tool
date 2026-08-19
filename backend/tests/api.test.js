const request = require('supertest');

process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'AdminPassword123';

const { createApp } = require('../src/server');
const { seedAdmin } = require('../src/seedAdmin');

let app;
let db;

beforeEach(async () => {
  // Fresh in-memory database for every test — no cross-test pollution.
  ({ app, db } = createApp(':memory:'));
  await seedAdmin(db);
});

describe('POST /api/auth/register (FR1)', () => {
  test('registers a new user with role "user"', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nurse@example.com', password: 'SecurePass123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('user');
  });

  test('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'SecurePass123' });
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'SecurePass123' });
    expect(res.status).toBe(409);
  });

  test('ignores client-supplied role — cannot self-register as admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'sneaky@example.com', password: 'SecurePass123', role: 'admin' });

    expect(res.body.user.role).toBe('user');
  });

  test('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@example.com', password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login (FR2)', () => {
  test('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send({ email: 'login@example.com', password: 'SecurePass123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'SecurePass123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send({ email: 'login2@example.com', password: 'SecurePass123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'login2@example.com', password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });
});

describe('FR15 — admin seeding', () => {
  test('seeded admin can log in with role "admin"', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'AdminPassword123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });
});

describe('POST /api/calculate/* (auth required, FR10 persistence)', () => {
  async function registerAndGetToken(email = 'calc@example.com') {
    const res = await request(app).post('/api/auth/register').send({ email, password: 'SecurePass123' });
    return res.body.token;
  }

  test('rejects calculation request without a token', async () => {
    const res = await request(app).post('/api/calculate/weight-based').send({
      category: 'Oncology',
      weightValue: 70,
      weightUnit: 'kg',
      dosePerKg: 2,
    });
    expect(res.status).toBe(401);
  });

  test('accepts authenticated calculation and stores history record', async () => {
    const token = await registerAndGetToken();

    const calcRes = await request(app)
      .post('/api/calculate/weight-based')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Oncology', weightValue: 70, weightUnit: 'kg', dosePerKg: 2 });

    expect(calcRes.status).toBe(200);
    expect(calcRes.body.result).toBe(140);

    const historyRes = await request(app).get('/api/history').set('Authorization', `Bearer ${token}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.history.length).toBe(1);
    expect(historyRes.body.history[0].category).toBe('Oncology');
    expect(historyRes.body.history[0].result).toBe(140);
  });

  test('rejects invalid category', async () => {
    const token = await registerAndGetToken('badcat@example.com');
    const res = await request(app)
      .post('/api/calculate/weight-based')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Not A Real Category', weightValue: 70, weightUnit: 'kg', dosePerKg: 2 });
    expect(res.status).toBe(400);
  });

  test('response includes a refreshed token header (NFR9 sliding expiry)', async () => {
    const token = await registerAndGetToken('refresh@example.com');
    const res = await request(app)
      .post('/api/calculate/weight-based')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'ICU', weightValue: 70, weightUnit: 'kg', dosePerKg: 2 });

    expect(res.headers['x-refreshed-token']).toBeDefined();
  });
});

describe('GET /api/history (FR12 — own history only)', () => {
  test('a user cannot see another user\'s history', async () => {
    const tokenA = (await request(app).post('/api/auth/register').send({ email: 'a@example.com', password: 'SecurePass123' })).body.token;
    const tokenB = (await request(app).post('/api/auth/register').send({ email: 'b@example.com', password: 'SecurePass123' })).body.token;

    await request(app)
      .post('/api/calculate/weight-based')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ category: 'ICU', weightValue: 70, weightUnit: 'kg', dosePerKg: 2 });

    const historyB = await request(app).get('/api/history').set('Authorization', `Bearer ${tokenB}`);
    expect(historyB.body.history.length).toBe(0);
  });
});

describe('GET /api/reports/* (FR13, FR14 — admin only)', () => {
  async function adminToken() {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'AdminPassword123' });
    return res.body.token;
  }

  test('non-admin cannot access reports', async () => {
    const token = (await request(app).post('/api/auth/register').send({ email: 'plain@example.com', password: 'SecurePass123' })).body.token;
    const res = await request(app).get('/api/reports/by-category').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('admin can retrieve report by category (FR13)', async () => {
    const userToken = (await request(app).post('/api/auth/register').send({ email: 'reportuser@example.com', password: 'SecurePass123' })).body.token;

    await request(app)
      .post('/api/calculate/weight-based')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ category: 'Paediatrics', weightValue: 20, weightUnit: 'kg', dosePerKg: 1 });

    const token = await adminToken();
    const res = await request(app).get('/api/reports/by-category').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.report.some((r) => r.category === 'Paediatrics' && r.count === 1)).toBe(true);
  });

  test('admin can retrieve report by user (FR14)', async () => {
    const userToken = (await request(app).post('/api/auth/register').send({ email: 'reportuser2@example.com', password: 'SecurePass123' })).body.token;

    await request(app)
      .post('/api/calculate/weight-based')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ category: 'Emergency', weightValue: 20, weightUnit: 'kg', dosePerKg: 1 });

    const token = await adminToken();
    const res = await request(app).get('/api/reports/by-user').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.report.some((r) => r.email === 'reportuser2@example.com' && r.count === 1)).toBe(true);
  });
});
