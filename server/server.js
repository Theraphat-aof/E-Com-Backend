// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// --- Import Routes ---
const productRoutes = require('./routes/product-routes');
const authRoutes = require('./routes/auth-routes');
const orderRoutes = require('./routes/order-routes');
const adminRoutes = require('./routes/admin-routes');
const chatRoutes = require('./routes/chat-routes');
const { authenticateUser } = require('./middleware/auth');

// --- Import Services (สำหรับ Socket) ---
const chatService = require('./services/chat-service');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const healthRoutes = require('./routes/health-routes');

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

// ✅ Security Middleware
app.use(helmet()); // ✅ เพิ่ม Security Headers
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://hathamshop.vercel.app' // ✅ ใส่ตรงๆ แบบนี้ชัวร์กว่า
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// ✅ Body Size Limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb' }));

// ✅ Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // เข้มข้นกว่า
  message: 'Too many login attempts'
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// --- Routes Setup ---
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', authenticateUser, orderRoutes); // ✅ เพิ่ม Auth
app.use('/api/admin', adminRoutes);
app.use('/api/chat', authenticateUser, chatRoutes); // ✅ เพิ่ม Auth

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/health', healthRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Create HTTP server
const server = http.createServer(app);

// ✅ Socket.io ต้อง Authenticate
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://hathamshop.vercel.app' // ✅ ต้องตรงกัน
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ✅ Socket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication failed'));
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// --- Socket.io Logic ---
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  // 1. Admin Login: เข้าห้อง admin_room เพื่อรอรับแจ้งเตือน
  socket.on('admin_login', () => {
    if (socket.userRole !== 'admin') {
      socket.emit('error', 'Admin access required');
      return;
    }
    socket.join('admin_room');
  });

  // 2. Join Room: เข้าห้องแชท + โหลดประวัติเก่าจาก DB
  socket.on('join_room', async (room) => {
    // ✅ Validate room format
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(room)) {
      socket.emit('error', 'Invalid room ID');
      return;
    }
    socket.join(room);
    console.log(`User ${socket.userId} joined ${room}`);

    try {
      // ดึงประวัติแชทจาก Database ผ่าน Service
      const messages = await chatService.getMessagesByRoom(room);

      // จัดรูปแบบข้อมูลก่อนส่งกลับไป Frontend
      const formattedHistory = messages.map((msg) => ({
        id: msg.id,
        room: msg.room_id,
        author: msg.sender_role === 'admin' ? 'Admin' : 'User',
        message: msg.message,
        timestamp: msg.created_at,
        time: new Date(msg.created_at).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        }),

        isAdmin: msg.sender_role === 'admin'
      }));

      // ส่งประวัติกลับไปให้คนที่เพิ่ง Join
      socket.emit('load_chat_history', formattedHistory);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  });

  // 3. Send Message: รับข้อความ -> บันทึก DB -> ส่งต่อ
  socket.on('send_message', async (data) => {
    try {
      // ✅ Validate input
      if (typeof data.message !== 'string' || data.message.length > 1000) {
        socket.emit('error', 'Invalid message');
        return;
      }

      const savedMsg = await chatService.saveMessage(
        data.room,
        socket.userRole,
        data.message,
        socket.userId // ✅ เก็บ userId
      );

      // เตรียมข้อมูลตอบกลับ (ใช้ ID จริงจาก DB เพื่อป้องกันข้อความซ้ำ)
      const responseData = {
        ...data,
        id: savedMsg.id,
        userId: socket.userId,
        timestamp: savedMsg.created_at,
        time: new Date(savedMsg.created_at).toLocaleTimeString('th-TH')
      };

      // ส่งข้อความหาทุกคนในห้องนั้น (User <-> Admin)
      socket.to(data.room).emit('receive_message', responseData);

      // ถ้าคนส่งไม่ใช่ Admin -> แจ้งเตือนเข้าห้อง Admin (Sidebar Alert)
      if (socket.userRole !== 'admin') {
        io.to('admin_room').emit('new_message_alert', responseData);
      }
    } catch (err) {
      console.error('Chat error:', err);
      socket.emit('error', 'Failed to save message');
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Start Server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
