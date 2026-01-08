// src/services/productService.js
const pool = require('../config/db');

const getAllProducts = async () => {
  const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
  return result.rows;
};

const getProductById = async (id) => {
  try {
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
