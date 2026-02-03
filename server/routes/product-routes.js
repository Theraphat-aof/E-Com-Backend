// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productService = require('../services/product-service');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server Error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

// GET /api/products/:id  
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
