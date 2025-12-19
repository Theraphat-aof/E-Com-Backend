const express = require("express");
const router = express.Router();
const pool = require("../config/db");
require("dotenv").config(); // โหลดค่าจาก .env

// เรียกใช้ Stripe จากตัวแปรใน .env
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// POST: สร้าง Payment Intent (สำหรับ Stripe)
router.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;

  // หมายเหตุ: ในระบบจริง ควรดึงราคา (Price) จาก Database มาคำนวณใหม่ 
  // เพื่อป้องกัน Hacker แก้ราคาจากฝั่ง Frontend ส่งมาเป็น 0 บาท
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

// POST: สั่งซื้อสินค้า (สร้าง Order ลง DB)
router.post('/place-order', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, items, totalAmount, shippingAddress } = req.body;

    await client.query('BEGIN'); // เริ่ม Transaction

    // 1. สร้าง Order หลัก
    const orderQuery = `
      INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_phone, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `;
    const orderValues = [userId, totalAmount, shippingAddress.name, shippingAddress.address, shippingAddress.phone];
    const orderResult = await client.query(orderQuery, orderValues);
    const orderId = orderResult.rows[0].id;

    // 2. บันทึกรายการสินค้า (Order Items)
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [orderId, item.id, item.quantity, item.price]
      );
    }

    await client.query('COMMIT'); // ยืนยันข้อมูล
    res.status(201).json({ message: 'Order created', orderId });

  } catch (error) {
    await client.query('ROLLBACK'); // ยกเลิกถ้ามี Error
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// GET: ดึงประวัติการสั่งซื้อ (Optimized SQL)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // ใช้ JSON_AGG เพื่อดึง Order พร้อม Items ใน Query เดียว (เร็วกว่าการวนลูป)
    const query = `
      SELECT 
        o.id, o.total_amount, o.status, o.created_at,
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
    res.status(500).send('Server Error');
  }
});

// ฟังก์ชันสุ่มเลขพัสดุ (Mock)
const generateTrackingNumber = () => {
    // สุ่มเลข 9 หลัก เช่น TH837492810
    const randomNum = Math.floor(100000000 + Math.random() * 900000000);
    return `TH${randomNum}`; 
    // หรือถ้าอยากเท่ๆ ให้เข้าธีมร้านเกม: return `DEV${randomNum}XP`;
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
    // ถ้าสถานะเป็น 'shipped' ให้สร้างเลขพัสดุ (ถ้ายังไม่มี)
    if (status === 'shipped') {
       // เช็คก่อนว่ามีเลขหรือยัง (จะได้ไม่เปลี่ยนเลขไปเรื่อย)
       const checkOrder = await client.query('SELECT tracking_number FROM orders WHERE id = $1', [id]);
       
       if (!checkOrder.rows[0].tracking_number) {
           trackingNumber = generateTrackingNumber();
           
           // อัปเดตทั้ง status และ tracking_number
           query = 'UPDATE orders SET status = $1, tracking_number = $2 WHERE id = $3 RETURNING *';
           values = [status, trackingNumber, id];
       } else {
           // มีเลขอยู่แล้ว อัปเดตแค่ status
           query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
           values = [status, id];
       }
    } else {
       // สถานะอื่น (paid, completed) อัปเดตปกติ
       query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
       values = [status, id];
    }

    // 1. รัน Query อัปเดต
    const updateResult = await client.query(query, values);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found' });
    }

    // 2. Logic ตัดสต็อก (จากรอบที่แล้ว)
    if (status === 'paid') {
      const orderItems = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );
      for (let item of orderItems.rows) {
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