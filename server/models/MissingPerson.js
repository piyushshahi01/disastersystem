const mongoose = require('mongoose');

const MissingPersonSchema = new mongoose.Schema({
  name: String,
  age: String,
  description: String,
  lastSeen: String,
  image: String, // Base64
  status: { type: String, default: 'approved' }, // 'pending' (if you want admin check) or 'approved'
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
      user: String,
      text: String,
      createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MissingPerson', MissingPersonSchema);