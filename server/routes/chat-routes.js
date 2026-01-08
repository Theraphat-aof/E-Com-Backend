// routes/chat-routes.js
const express = require('express');
const router = express.Router();
const chatService = require('../services/chat-service');
const { validateChatInput, handleValidationErrors } = require('../middleware/auth');

// GET /api/chat/rooms
router.get('/rooms', async (req, res) => {
  try {
    const chats = await chatService.getRecentChats();

    const formattedChats = chats.map((chat) => ({
      room: chat.room_id,
      user: chat.sender_role === 'admin' ? 'Admin' : 'User', 
      lastMsg: chat.message,
      time: new Date(chat.created_at).toISOString()
    }));

    res.json(formattedChats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

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
