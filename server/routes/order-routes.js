const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const stripe = require("stripe")(
  "sk_test_51SeSSxGXttjtdRAX1PYBSZNlp65jZrjEagyLoKTdxCKxHZ3PhIz0GTbk9UJCT1Db5hGYqDChFsqIHNyvvptttuCa00xWcBP1HG"
);

router.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;

  const calculateOrderAmount = (items) => {
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return Math.round(total * 100);
  };

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculateOrderAmount(items),
      currency: "thb",
      automatic_payment_methods: { enabled: true },
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST สั่งซื้อสินค้า
router.post('/place-order', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, items, totalAmount, shippingAddress } = req.body;

    await client.query('BEGIN');

    const orderQuery = `
      INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_phone, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `;
    const orderValues = [userId, totalAmount, shippingAddress.name, shippingAddress.address, shippingAddress.phone];
    const orderResult = await client.query(orderQuery, orderValues);
    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [orderId, item.id, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Order created', orderId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const ordersResult = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', 
      [userId]
    );
    const orders = ordersResult.rows;

    for (let order of orders) {
      const itemsResult = await pool.query(
        `SELECT oi.*, p.name, p.image_url 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// PATCH อัปเดตสถานะออเดอร์
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
