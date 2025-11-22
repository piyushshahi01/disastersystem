const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, default: 'citizen' }, // 'citizen', 'admin', 'responder'
  
  // --- NEW FEATURES ---
  isVolunteer: { type: Boolean, default: false },
  emergencyContacts: [{ 
      name: String, 
      phone: String 
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);