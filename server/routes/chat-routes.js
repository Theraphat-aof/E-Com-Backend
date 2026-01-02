// routes/chat-routes.js
const express = require('express');
const router = express.Router();
const chatService = require('../services/chat-service');
const { validateChatInput, handleValidationErrors } = require('../middleware/auth');

// API: ดึงรายชื่อคนที่เคยทักมาทั้งหมด (ใช้ใน Admin Sidebar)
// GET /api/chat/rooms
router.get('/rooms', async (req, res) => {
  try {
    const chats = await chatService.getRecentChats();

    // แปลงข้อมูลให้ตรงกับ Format ที่ Frontend ใช้
    const formattedChats = chats.map((chat) => ({
      room: chat.room_id,
      user: chat.sender_role === 'admin' ? 'Admin' : 'User', // หรือจะดึงชื่อ User จริงก็ได้
      lastMsg: chat.message,
      time: new Date(chat.created_at).toISOString()
    }));

    res.json(formattedChats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// API: ดึงประวัติแชทของห้องใดห้องหนึ่ง
// GET /api/chat/history/:roomId
router.get('/history/:roomId', validateChatInput, handleValidationErrors, async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await chatService.getMessagesByRoom(roomId);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
