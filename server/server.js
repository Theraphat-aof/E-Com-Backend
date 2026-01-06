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
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

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
    console.error('[Socket Auth] No token provided');
    return next(new Error('Authentication failed: No token'));
  }

  try {
    const jwt = require('jsonwebtoken');
    if (!process.env.JWT_SECRET) {
      console.error('[Socket Auth] JWT_SECRET not configured');
      return next(new Error('Server configuration error'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    console.log(`[Socket Auth] Authenticated user ${socket.userId} (role: ${socket.userRole})`);
    next();
  } catch (err) {
    console.error('[Socket Auth] Token verification failed:', err.message);
    next(new Error('Invalid token: ' + err.message));
  }
});

// --- Socket.io Logic ---
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  // 1. Admin Login: เข้าห้อง admin_room เพื่อรอรับแจ้งเตือน
  socket.on('admin_login', () => {
    console.log(`[admin_login] User ${socket.userId}, role: ${socket.userRole}`);
    if (socket.userRole !== 'admin') {
      console.error(`[admin_login] Unauthorized access attempt by user ${socket.userId}`);
      socket.emit('error', 'Admin access required');
      return;
    }
    socket.join('admin_room');
    console.log(`[admin_login] Admin ${socket.userId} successfully joined admin_room`);
  });

  // 2. Join Room: เข้าห้องแชท + โหลดประวัติเก่าจาก DB
  socket.on('join_room', async (room) => {
    // ✅ Validate room format
    if (!room || !/^[a-zA-Z0-9_-]{1,50}$/.test(room)) {
      console.error(`[join_room] Invalid room ID from user ${socket.userId}: "${room}"`);
      socket.emit('error', 'Invalid room ID format');
      return;
    }
    socket.join(room);
    console.log(`[join_room] User ${socket.userId} (${socket.userRole}) joined room ${room}`);

    try {
      // ดึงประวัติแชทจาก Database ผ่าน Service
      const messages = await chatService.getMessagesByRoom(room);
      console.log(`[join_room] Loaded ${messages.length} messages from room ${room}`);

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
      console.error(`[join_room] Error loading chat history for room ${room}:`, err.message);
      socket.emit('error', 'Failed to load chat history: ' + err.message);
    }
  });

  // 3. Send Message: รับข้อความ -> บันทึก DB -> ส่งต่อ
  socket.on('send_message', async (data) => {
    try {
      // ✅ Validate input
      if (!data || !data.room) {
        console.error(`[send_message] Missing room ID from user ${socket.userId}`);
        socket.emit('error', 'Room ID is required');
        return;
      }

      if (
        typeof data.message !== 'string' ||
        data.message.length === 0 ||
        data.message.length > 1000
      ) {
        console.error(
          `[send_message] Invalid message from user ${socket.userId}: length=${data.message?.length}`
        );
        socket.emit('error', 'Message must be 1-1000 characters');
        return;
      }

      console.log(`[send_message] User ${socket.userId} sending message to room ${data.room}`);

      // Normalize roles: some JWTs use 'customer' instead of 'user'
      const normalizedRole = socket.userRole === 'customer' ? 'user' : socket.userRole || 'user';
      console.log(`[send_message] Normalized role for user ${socket.userId}: ${normalizedRole}`);

      const savedMsg = await chatService.saveMessage(
        data.room,
        normalizedRole,
        data.message,
        socket.userId // ✅ เก็บ userId
      );

      console.log(`[send_message] Message saved with ID ${savedMsg.id}`);

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
      console.log(`[send_message] Broadcasted to room ${data.room}`);

      // ถ้าคนส่งไม่ใช่ Admin -> แจ้งเตือนเข้าห้อง Admin (Sidebar Alert)
      if (socket.userRole !== 'admin') {
        io.to('admin_room').emit('new_message_alert', responseData);
        console.log('[send_message] Alert sent to admin_room');
      }
    } catch (err) {
      console.error(`[send_message] Error for user ${socket.userId}:`, err.message);
      socket.emit('error', 'Failed to save message: ' + err.message);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] User ${socket.userId} disconnected (reason: ${reason})`);
  });
});

// Start Server
server.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`✅ WebSocket ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
