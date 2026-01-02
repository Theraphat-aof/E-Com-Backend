// services/chat-service.js
const pool = require('../config/db');

// 1. บันทึกข้อความ
exports.saveMessage = async (roomId, senderRole, message, userId) => {
  // ✅ Validate inputs
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(roomId)) {
    throw new Error('Invalid room ID');
  }

  if (!['admin', 'user'].includes(senderRole)) {
    throw new Error('Invalid sender role');
  }

  if (typeof message !== 'string' || message.length > 1000) {
    throw new Error('Invalid message');
  }

  const query = `
    INSERT INTO chat_messages (room_id, sender_role, message, user_id) 
    VALUES ($1, $2, $3, $4) 
    RETURNING id, room_id, sender_role, message, created_at
  `;
  const result = await pool.query(query, [roomId, senderRole, message, userId]);
  return result.rows[0];
};

// 2. ดึงประวัติการคุยตามห้อง
exports.getMessagesByRoom = async (roomId) => {
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(roomId)) {
    throw new Error('Invalid room ID');
  }

  const query = `
    SELECT id, room_id, sender_role, message, created_at
    FROM chat_messages 
    WHERE room_id = $1 
    ORDER BY created_at ASC
    LIMIT 100
  `;
  const result = await pool.query(query, [roomId]);
  return result.rows;
};

// 3. (เสริม) ดึงรายชื่อห้องที่เคยคุยทั้งหมด (สำหรับ Admin Sidebar)
// คำสั่งนี้จะดึงข้อความล่าสุดของแต่ละห้องมาแสดง
exports.getRecentChats = async () => {
  const query = `
    SELECT DISTINCT ON (room_id) 
      room_id, message, created_at, sender_role
    FROM chat_messages
    ORDER BY room_id, created_at DESC
    LIMIT 50
  `;
  const result = await pool.query(query);
  return result.rows;
};
