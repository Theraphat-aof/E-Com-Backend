// src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production'; 
const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction || (connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'))
    ? { rejectUnauthorized: false } 
    : false, 

  max: 20, 
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 10000 
});

module.exports = pool;
