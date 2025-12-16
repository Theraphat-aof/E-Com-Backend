// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    // 1. ตรวจสอบกับ Google ว่า Token นี้ของจริงไหม
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    // ได้ข้อมูลมาแล้ว: email, name, picture, sub (google_id)
    const { email, name, picture, sub: googleId } = payload;

    // 2. เช็คว่ามี User นี้ใน Database หรือยัง?
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userResult.rows[0];

    if (!user) {
      // 3. ถ้าไม่มี -> สมัครสมาชิกใหม่ให้เลย (Auto Register)
      const newUser = await pool.query(
        'INSERT INTO users (username, email, google_id, profile_picture, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, googleId, picture, 'customer']
      );
      user = newUser.rows[0];
    } else {
        // อัปเดตข้อมูลล่าสุด (เช่น รูปโปรไฟล์)
        await pool.query('UPDATE users SET google_id = $1, profile_picture = $2 WHERE email = $3', [googleId, picture, email]);
    }

    // 4. สร้าง JWT Token ของเว็บเราเอง (Session)
    // ตรง 'MY_SECRET_KEY' ควรย้ายไปอยู่ใน .env จริงๆ
    const myToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role }, 
      process.env.JWT_SECRET || 'secret123', 
      { expiresIn: '1d' }
    );

    res.json({ user, token: myToken });

  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Google Login Failed' });
  }
});

module.exports = router;