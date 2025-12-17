// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Routes
const productRoutes = require('./routes/product-routes');
const authRoutes = require('./routes/auth-routes');
const orderRoutes = require('./routes/order-routes');

const adminRoutes = require('./routes/admin-routes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes Setup
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

app.use('/api/admin', adminRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});