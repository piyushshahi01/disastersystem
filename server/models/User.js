const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'citizen' },
  phone: { type: String },
  vehicleNumber: { type: String },
  isVolunteer: { type: Boolean, default: false },
  emergencyContacts: [{ name: String, phone: String }],
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to hash password before saving to database
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);