const express = require('express');
const router = express.Router();
const pool = require('../config/db');
// ✅ เพิ่มบรรทัดนี้ครับ
const { authenticateUser, authorizeAdmin } = require('../middleware/auth');

// ✅ Health Check Endpoint (ไม่ต้องใช้ Auth)
router.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: dbCheck.rows[0] ? 'Connected' : 'Disconnected',
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      error: err.message
    });
  }
});

// ✅ ดึง Server Stats (ต้องใช้ Auth)
router.get('/stats', authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const orderCount = await pool.query('SELECT COUNT(*) FROM orders');
    const productCount = await pool.query('SELECT COUNT(*) FROM products');

    res.json({
      users: parseInt(userCount.rows[0].count),
      orders: parseInt(orderCount.rows[0].count),
      products: parseInt(productCount.rows[0].count),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
