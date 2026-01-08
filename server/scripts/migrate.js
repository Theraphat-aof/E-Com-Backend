const fs = require('fs');
const path = require('path');
const { Pool } = require('pg'); 
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is missing in environment variables.');
  console.error('   Please check your .env file (local) or Render Environment settings.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000 
});

async function runMigrations() {
  let client;

  try {
    console.log('🔌 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected successfully.');

    console.log('🚀 Starting migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationPath = path.join(__dirname, '../migrations');

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
        console.error(`❌ Failed processing file: ${file}`);
        throw err; 
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
    await pool.end(); 
  }
}

runMigrations();
