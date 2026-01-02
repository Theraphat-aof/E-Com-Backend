const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth-routes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  describe('POST /api/auth/google', () => {
    it('should return 400 if no token provided', async () => {
      const res = await request(app).post('/api/auth/google').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 if invalid token', async () => {
      const res = await request(app).post('/api/auth/google').send({ token: 'invalid_token_xyz' });

      expect(res.status).toBe(401);
    });
  });
});
