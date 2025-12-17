const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken'); // ต้องใช้แกะ Token

// --- สร้าง Middleware ตรวจสอบ Admin ---
const checkAdmin = async (req, res, next) => {
  try {
    // 1. รับ Token จาก Header (Authorization: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).send('Access Denied: No Token Provided');

    // 2. แกะ Token ดูข้อมูลข้างใน
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

    // 3. เช็คว่า role เป็น 'admin' หรือไม่?
    // (เพื่อความชัวร์ Query ถาม DB อีกรอบก็ได้ แต่เช็คจาก Token เร็วกว่า)
    if (decoded.role !== 'admin') {
      return res.status(403).send('Access Denied: You are not Admin');
    }

    // ผ่าน! อนุญาตให้ไปต่อ
    req.user = decoded;
    next();

  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

// --- นำ Middleware ไปคั่นไว้ก่อนเรียกฟังก์ชัน ---

// GET /api/admin/orders
router.get('/orders', checkAdmin, async (req, res) => { // ใส่ checkAdmin ตรงนี้
  try {
    const result = await pool.query(`
      SELECT o.*, u.username 
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// PATCH /api/admin/orders/:id/ship
router.patch('/orders/:id/ship', checkAdmin, async (req, res) => { // ใส่ checkAdmin ตรงนี้
  // ... (โค้ดเดิม) ...
});

module.exports = router;