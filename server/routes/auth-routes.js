// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in .env');
}

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    // Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email from Google' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userResult.rows[0];

    if (!user) {
      const newUser = await pool.query(
        'INSERT INTO users (username, email, google_id, profile_picture, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role',
        [name || 'User', email, googleId, picture, 'customer']
      );
      user = newUser.rows[0];
    } else {
      await pool.query('UPDATE users SET google_id = $1, profile_picture = $2 WHERE email = $3', [
        googleId,
        picture,
        email
      ]);
    }

    // ใช้ process.env.JWT_SECRET 
    const myToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } 
    );

    res.json({ user, token: myToken });
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

router.post('/demo-login', async (req, res) => {
  try {
    const email = 'test@example.com';

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userResult.rows[0];

    if (!user) {
      const newUser = await pool.query(
        'INSERT INTO users (username, email, google_id, profile_picture, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [
          'Test User',
          email,
          'test-google-id',
          'https://ui-avatars.com/api/?name=Test+User',
          'customer'
        ]
      );
      user = newUser.rows[0];
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ user, token });
  } catch (error) {
    console.error('Demo Login Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
