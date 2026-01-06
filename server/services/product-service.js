// src/services/productService.js
const pool = require('../config/db');

// ฟังก์ชันดึงสินค้าทั้งหมด
const getAllProducts = async () => {
  const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
  return result.rows;
};

// ฟังก์ชันดึงสินค้าตาม ID (เผื่อใช้หน้า Detail)
const getProductById = async (id) => {
  try {
    // เปลี่ยน WHERE id เป็น WHERE uuid
    const result = await pool.query('SELECT * FROM products WHERE uuid = $1', [id]);

    if (result.rows.length === 0) {
      return { message: 'Product not found' };
    }

    return result.rows[0];
  } catch (err) {
    console.error(err);
    return { error: 'Server Error' };
  }
};

module.exports = {
  getAllProducts,
  getProductById
};
