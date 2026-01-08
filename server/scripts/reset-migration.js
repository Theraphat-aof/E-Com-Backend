const pool = require('../config/db');
require('dotenv').config();

(async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Checking migrations table...');

    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'migrations'
      )
    `);

    if (!result.rows[0].exists) {
      console.log('⚠️  Migrations table does not exist');
      process.exit(0);
    }

    const migrations = await client.query('SELECT * FROM migrations');
    console.log('Current migrations:', migrations.rows);

    if (migrations.rows.length > 0) {
      await client.query('DELETE FROM migrations WHERE name = $1', ['001_update_db.sql']);
      console.log('✅ Deleted failed migration record: 001_update_db.sql');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
})();
