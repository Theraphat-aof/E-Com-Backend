const fs = require('fs');
const path = require('path');
const { Pool } = require('pg'); // เรียกใช้ pg โดยตรง ไม่ผ่าน config/db.js
require('dotenv').config();

// 1. ตรวจสอบว่ามีค่า Connection String หรือไม่
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is missing in environment variables.');
  console.error('   Please check your .env file (local) or Render Environment settings.');
  process.exit(1);
}

// 2. สร้าง Pool ใหม่สำหรับ Migration โดยเฉพาะ
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ⚠️ สำคัญ: Render + Supabase ต้องเปิด SSL
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000 // รอเชื่อมต่อสูงสุด 10 วินาที
});

async function runMigrations() {
  let client;

  try {
    console.log('🔌 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected successfully.');

    console.log('🚀 Starting migrations...');

    // สร้าง migrations table ถ้ายังไม่มี
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationPath = path.join(__dirname, '../migrations');

    // ตรวจสอบว่ามีโฟลเดอร์ migrations จริงไหม
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Error: Migration folder not found at ${migrationPath}`);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationPath).sort();

    if (files.length === 0) {
      console.log('ℹ️  No migration files found.');
    }

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      // ตรวจสอบว่า migration นี้รันแล้วหรือยัง
      const existing = await client.query('SELECT * FROM migrations WHERE name = $1', [file]);

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipped: ${file} (already executed)`);
        continue;
      }

      const filePath = path.join(migrationPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        // รัน SQL ทีละไฟล์
        await client.query(sql);
        // บันทึกว่าทำเสร็จแล้ว
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Executed: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed processing file: ${file}`);
        throw err; // โยน error ออกไปเพื่อให้ catch ด้านล่างทำงาน
      }
    }

    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Fatal Error:', err.message);
    if (err.message.includes('self signed certificate')) {
      console.error(
        '   Hint: This is an SSL issue. Ensure ssl: { rejectUnauthorized: false } is set.'
      );
    }
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end(); // ปิด Connection Pool
  }
}

runMigrations();
