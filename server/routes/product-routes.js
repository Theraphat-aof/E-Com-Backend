// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productService = require('../services/product-service');

/**
 * @swagger
 * {
 * "components": {
 * "schemas": {
 * "Product": {
 * "type": "object",
 * "properties": {
 * "id": { "type": "integer" },
 * "name": { "type": "string" },
 * "price": { "type": "number" },
 * "stock_quantity": { "type": "integer" }
 * }
 * }
 * }
 * }
 * }
 */

/**
 * @swagger
 * {
 * "/products": {
 * "get": {
 * "summary": "ดึงรายการสินค้าทั้งหมด",
 * "tags": ["Products"],
 * "responses": {
 * "200": {
 * "description": "รายชื่อสินค้าทั้งหมด",
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "array",
 * "items": { "$ref": "#/components/schemas/Product" }
 * }
 * }
 * }
 * }
 * }
 * }
 * }
 * }
 */

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET /api/products/:id  (เช่น /api/products/1)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      return res.status(404).send('Product not found');
    }

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
