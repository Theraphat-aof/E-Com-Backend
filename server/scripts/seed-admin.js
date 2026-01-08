const pool = require('../config/db');
require('dotenv').config();

async function seedAdmin() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding admin user...');

    const adminEmail = 'admin@ecommerce.local';

    const existing = await client.query('SELECT id FROM users WHERE email = $1 AND role = $2', [
      adminEmail,
      'admin'
    ]);

    if (existing.rows.length > 0) {
      console.log('⏭️  Admin user already exists');
      process.exit(0);
    }

    const adminUser = await client.query(
      `INSERT INTO users (username, email, role, is_active, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id, email, role, created_at`,
      ['Admin', adminEmail, 'admin', true]
    );

    console.log('✅ Admin user created successfully:');
    console.log(JSON.stringify(adminUser.rows[0], null, 2));

    console.log('\n📝 Next steps:');
    console.log('1. Login with Google OAuth first');
    console.log('2. Update user role to admin manually or via database');
    console.log('3. Or use: UPDATE users SET role = "admin" WHERE email = "your-email@gmail.com"');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedAdmin();
