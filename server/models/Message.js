const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  room: String, // sosId
  author: String,
  message: String,
  role: String, // 'citizen', 'responder', 'admin'
  time: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);