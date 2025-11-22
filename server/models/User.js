const mongoose = require('mongoose');
// REMOVE: const bcrypt = require('bcryptjs'); 

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // Password will be stored in plain text (non-secure for this final deployment)
  password: { type: String, required: true }, 
  role: { type: String, default: 'citizen' },
  phone: { type: String },
  vehicleNumber: { type: String },
  isVolunteer: { type: Boolean, default: false },
  emergencyContacts: [{ name: String, phone: String }],
  createdAt: { type: Date, default: Date.now }
});

// REMOVE THE PRE-SAVE HOOK
// UserSchema.pre('save', async function(next) { ... });

module.exports = mongoose.model('User', UserSchema);