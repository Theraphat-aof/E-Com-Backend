// middleware/auth.js
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');
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
    console.error('Auth Error:', err.message);
    res.status(401).json({ message: 'Invalid Token' });
  }
};

// ✅ Authenticate User (ตรวจสอบ Token)
const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    console.error('Auth Error:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ✅ Authorize Admin Only
const authorizeAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

// ✅ Authorize Owner (ผู้ใช้ดูของตัวเองเท่านั้น)
const authorizeOwner = (paramName = 'userId') => {
  return (req, res, next) => {
    const targetUserId = parseInt(req.params[paramName]);

    if (targetUserId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }
    next();
  };
};

// ✅ Input Validation
const validateOrderCreation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be non-empty array'),
  body('items.*.id').isInt({ min: 1 }).withMessage('Product ID invalid'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('shippingAddress.name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('shippingAddress.address').trim().notEmpty().isLength({ min: 5, max: 500 }),
  body('shippingAddress.phone')
    .matches(/^[\d\s\-+()]{7,20}$/)
    .withMessage('Invalid phone')
];

const validateChatInput = [
  param('roomId').isAlphanumeric().isLength({ max: 50 }),
  body('message').trim().notEmpty().isLength({ min: 1, max: 1000 })
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  checkAdmin,
  authenticateUser,
  authorizeAdmin,
  authorizeOwner,
  validateOrderCreation,
  validateChatInput,
  handleValidationErrors
};
