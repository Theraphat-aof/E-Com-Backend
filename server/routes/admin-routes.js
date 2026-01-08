const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateUser, authorizeAdmin } = require('../middleware/auth');
const loggerService = require('../services/logger-service');

const generateTrackingNumber = () => {
  const randomNum = Math.floor(100000000 + Math.random() * 900000000);
  return `TH${randomNum}`;
};

// GET: ดึงออเดอร์ทั้งหมด
router.get('/orders', authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        o.id, o.total_amount, o.status, o.created_at, o.tracking_number,
        o.shipping_name, o.shipping_address, o.shipping_phone,
        u.username, u.email,
        json_agg(
          json_build_object(
            'product_name', p.name,
            'image_url', p.image_url,
            'quantity', oi.quantity,
            'price', oi.price_at_purchase
          )
        ) AS items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      GROUP BY o.id, u.username, u.email
      ORDER BY o.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// PATCH: อัปเดตสถานะ
router.patch('/orders/:id/status', authenticateUser, authorizeAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await client.query('BEGIN');

    const oldOrder = await client.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (oldOrder.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    let result;

    if (status === 'shipped') {
      const checkOrder = await client.query('SELECT tracking_number FROM orders WHERE id = $1', [
        id
      ]);

      if (!checkOrder.rows[0].tracking_number) {
        const trackingNumber = generateTrackingNumber();
        result = await client.query(
          'UPDATE orders SET status = $1, tracking_number = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
          [status, trackingNumber, id]
        );
      } else {
        result = await client.query(
          'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [status, id]
        );
      }
    } else {
      result = await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );
    }

    await loggerService.logAction(
      req.userId,
      'UPDATE_ORDER_STATUS',
      'orders',
      id,
      oldOrder.rows[0],
      result.rows[0],
      req.ip
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  } finally {
    client.release();
  }
});

// GET: Dashboard Stats
router.get('/stats', authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const statsQuery = `
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'paid' OR status = 'shipped' OR status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
            FROM orders
        `;
    const result = await pool.query(statsQuery);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/audit-logs', authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const { userId, action, limit = 100, offset = 0 } = req.query;

    const logs = await loggerService.getAuditLog({
      userId: userId ? parseInt(userId) : null,
      action,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
