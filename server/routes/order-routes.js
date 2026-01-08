const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  authenticateUser,
  validateOrderCreation,
  handleValidationErrors,
  authorizeOwner
} = require('../middleware/auth');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ✅ ดึงราคาจาก Database แทน Frontend
router.post('/create-payment-intent', authenticateUser, async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid items' });
  }

  try {
    // ✅ Query Database เพื่อตรวจสอบราคา
    const placeholders = items.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `SELECT id, price FROM products WHERE id IN (${placeholders}) AND is_active = true`,
      items.map((item) => item.id)
    );

    const priceMap = new Map(result.rows.map((row) => [row.id, row.price]));
    let total = 0;

    for (const item of items) {
      const dbPrice = priceMap.get(item.id);
      if (!dbPrice) {
        return res.status(400).json({ error: `Product ${item.id} not found` });
      }
      total += dbPrice * item.quantity;
    }

    const amount = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'thb',
      automatic_payment_methods: { enabled: true },
      metadata: { userId: req.userId }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// เพิ่ม Auth และ Validation
router.post(
  '/place-order',
  authenticateUser,
  validateOrderCreation,
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { items, totalAmount, shippingAddress } = req.body;
      const userId = req.userId; 

      await client.query('BEGIN');

      // Verify prices from DB
      const result = await client.query(
        'SELECT id, price, stock_quantity FROM products WHERE id = ANY($1) AND is_active = true',
        [items.map((i) => i.id)]
      );

      const productMap = new Map(result.rows.map((row) => [row.id, row]));
      let calculatedTotal = 0;

      for (const item of items) {
        const product = productMap.get(item.id);
        if (!product) throw new Error(`Product ${item.id} not found`);
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.id}`);
        }
        calculatedTotal += product.price * item.quantity;
      }

      // Verify total amount matches
      if (Math.abs(calculatedTotal - totalAmount) > 1) {
        throw new Error('Price mismatch detected');
      }

      const orderQuery = `
        INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_phone, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id
      `;
      const orderResult = await client.query(orderQuery, [
        userId,
        calculatedTotal,
        shippingAddress.name,
        shippingAddress.address,
        shippingAddress.phone
      ]);

      const orderId = orderResult.rows[0].id;

      for (const item of items) {
        const product = productMap.get(item.id);
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
          [orderId, item.id, item.quantity, product.price]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Order created', orderId });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      res.status(500).json({ error: error.message || 'Failed to create order' });
    } finally {
      client.release();
    }
  }
);

// เพิ่ม Auth + Ownership Check
router.get('/user/:userId', authenticateUser, authorizeOwner('userId'), async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
        SELECT 
          o.id, o.total_amount, o.status, o.created_at, o.tracking_number,
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'name', p.name,
              'image_url', p.image_url,
              'quantity', oi.quantity,
              'price_at_purchase', oi.price_at_purchase
            )
          ) AS items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

const generateTrackingNumber = () => {
  // สุ่มเลข 9 หลัก เช่น TH837492810
  const randomNum = Math.floor(100000000 + Math.random() * 900000000);
  return `TH${randomNum}`;
};

router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let trackingNumber = null;
    let query = '';
    let values = [];

    // --- Logic สร้างเลขพัสดุ ---
    if (status === 'shipped') {
      const checkOrder = await client.query('SELECT tracking_number FROM orders WHERE id = $1', [
        id
      ]);

      if (!checkOrder.rows[0].tracking_number) {
        trackingNumber = generateTrackingNumber();

        query = 'UPDATE orders SET status = $1, tracking_number = $2 WHERE id = $3 RETURNING *';
        values = [status, trackingNumber, id];
      } else {
        query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
        values = [status, id];
      }
    } else {
      query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
      values = [status, id];
    }

    const updateResult = await client.query(query, values);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status === 'paid') {
      const orderItems = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );
      for (const item of orderItems.rows) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

module.exports = router;
