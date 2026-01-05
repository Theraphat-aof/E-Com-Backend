-- เนื้อหาในไฟล์ server/migrations/001_update_db.sql

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  google_id VARCHAR(255),
  profile_picture VARCHAR(500),
  role VARCHAR(20) DEFAULT 'customer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INT DEFAULT 0,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  shipping_name VARCHAR(100),
  shipping_address VARCHAR(255),
  shipping_phone VARCHAR(20),
  tracking_number VARCHAR(100),
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price_at_purchase DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL,
  sender_role VARCHAR(50),
  message TEXT NOT NULL,
  user_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  table_name VARCHAR(100),
  record_id INT,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ✅ Test & Security Checks
--    ├─ Checkout code
--    ├─ Setup Node.js 18
--    ├─ Install dependencies
--    ├─ Run ESLint
--    ├─ Run Jest tests ← ต้อง PASS
--    ├─ Security audit
--    └─ Check vulnerabilities
--
-- ✅ Code Quality Analysis
--    ├─ ESLint check
--    ├─ Prettier format check
--    └─ SonarQube scan (optional)
--
-- ✅ Deploy to Production
--    ├─ Checkout code
--    ├─ Install dependencies
--    ├─ Run migrations
--    ├─ Deploy via SSH
--    └─ Notify Slack

-- Environment variables for production
-- PROD_DB_HOST
-- PROD_DB_PORT
-- PROD_DB_USER
-- PROD_DB_PASSWORD
-- PROD_DB_NAME
-- PROD_SERVER_HOST
-- PROD_SERVER_USER
-- PROD_SERVER_SSH_KEY
-- SLACK_WEBHOOK_URL (optional)

-- Repository → Actions → Latest run → เลือก job