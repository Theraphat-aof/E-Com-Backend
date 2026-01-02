// src/services/productService.js
const pool = require('../config/db');

// ฟังก์ชันดึงสินค้าทั้งหมด
const getAllProducts = async () => {
  const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
  return result.rows;
};

// ฟังก์ชันดึงสินค้าตาม ID (เผื่อใช้หน้า Detail)
const getProductById = async (id) => {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0];
};

module.exports = {
  getAllProducts,
  getProductById
};
