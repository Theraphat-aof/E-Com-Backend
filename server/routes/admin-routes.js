const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { checkAdmin } = require('../middleware/auth'); // เรียกใช้ Middleware ที่แยกไว้

// ฟังก์ชันสุ่มเลขพัสดุ (Helper Function) สำหรับทดสอบ ของจริงต้องใช้เลขพัสดุจากผู้ให้บริการขนส่ง
const generateTrackingNumber = () => {
  const randomNum = Math.floor(100000000 + Math.random() * 900000000);
  return `TH${randomNum}`; 
};

// --------------------------------------------------------
// 1. GET: ดึงออเดอร์ทั้งหมด + รายการสินค้าข้างใน (ใช้ JSON_AGG)
// --------------------------------------------------------
router.get('/orders', checkAdmin, async (req, res) => {
  try {
    // ใช้ SQL Join + JSON_AGG เพื่อให้ได้ข้อมูลครบจบใน Query เดียว
    // ไม่ต้องไปวน Loop ยิง DB ทีละออเดอร์ (แก้ปัญหา N+1 Query)
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

// --------------------------------------------------------
// 2. PATCH: อัปเดตสถานะ (Shipped -> สร้าง Tracking Number)
// --------------------------------------------------------
router.patch('/orders/:id/status', checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // รับค่า status เช่น 'shipped', 'cancelled'

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let query = '';
    let values = [];

    // Logic: ถ้าเปลี่ยนเป็น 'shipped' และยังไม่มีเลขพัสดุ -> ให้สร้างเลขใหม่
    if (status === 'shipped') {
       // เช็คก่อนว่ามีเลขหรือยัง
       const checkOrder = await client.query('SELECT tracking_number FROM orders WHERE id = $1', [id]);
       
       if (!checkOrder.rows[0].tracking_number) {
           const trackingNumber = generateTrackingNumber();
           query = 'UPDATE orders SET status = $1, tracking_number = $2 WHERE id = $3 RETURNING *';
           values = [status, trackingNumber, id];
       } else {
           // มีเลขแล้ว อัปเดตแค่สถานะ
           query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
           values = [status, id];
       }
    } else {
       // สถานะอื่นๆ อัปเดตปกติ
       query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
       values = [status, id];
    }

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// --------------------------------------------------------
// 3. GET: Dashboard Stats (แถมให้: ดูยอดขายรวม/จำนวนออเดอร์)
// --------------------------------------------------------
router.get('/stats', checkAdmin, async (req, res) => {
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

module.exports = router;