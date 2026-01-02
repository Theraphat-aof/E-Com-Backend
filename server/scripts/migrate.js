const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const client = await pool.connect();

  try {
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
    const files = fs.readdirSync(migrationPath).sort();

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
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Executed: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed: ${file}`, err.message);
        throw err;
      }
    }

    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations();
