// src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production'; 
const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// --- Debug Logging (Sanitized) ---
try {
  if (connectionString) {
    const url = new URL(connectionString);
    console.log(`[DB Config] Host: ${url.hostname}`);
    console.log(`[DB Config] Database: ${url.pathname.split('/')[1]}`);
    console.log(`[DB Config] SSL Enabled: ${isProduction || (connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'))}`);
  } else {
    console.error('[DB Config] Error: No connection string found!');
  }
} catch (e) {
  console.log('[DB Config] Could not parse connection string for logging');
}
// ---------------------------------

const pool = new Pool({
  connectionString: connectionString,
  ssl: (process.env.RENDER || isProduction || (connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')))
    ? { rejectUnauthorized: false } 
    : false, 

  max: 20, 
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 10000 
});

module.exports = pool;
