// middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware เช็คว่าเป็น Admin เท่านั้น
const checkAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    // ใช้ process.env.JWT_SECRET เท่านั้น ห้าม Hardcode 'secret123' ใน Production เด็ดขาด!
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access Denied: You are not Admin' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth Error:", err.message);
    res.status(401).json({ message: 'Invalid Token' });
  }
};

module.exports = { checkAdmin };