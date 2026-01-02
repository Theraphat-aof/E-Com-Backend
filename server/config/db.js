// src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'development'; // ทำงานจริงให้ใช้ Production

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false } // สำหรับ Production (เช่น Heroku, Render, Neon)
    : false, // สำหรับ Localhost (ปิด SSL)

  // Performance Config (ปรับตามความเหมาะสม)
  max: 20, // จำนวน Connection สูงสุดพร้อมกัน
  idleTimeoutMillis: 30000, // ตัด Connection ทิ้งถ้าไม่ได้ใช้เกิน 30 วิ
  connectionTimeoutMillis: 2000 // ถ้ารอต่อ Database นานเกิน 2 วิ ให้ Error เลย
});

module.exports = pool;
