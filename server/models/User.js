const mongoose = require('mongoose');
const CryptoJS = require('crypto-js'); // Use Crypto-JS for pure JS hashing

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Now stores the SHA256 hash
  role: { type: String, default: 'citizen' },
  phone: { type: String },
  vehicleNumber: { type: String },
  isVolunteer: { type: Boolean, default: false },
  emergencyContacts: [{ name: String, phone: String }],
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to hash password before saving to database
UserSchema.pre('save', function(next) {
    if (!this.isModified('password')) return next();
    
    // Hash the password using SHA-256
    this.password = CryptoJS.SHA256(this.password).toString();
    next();
});

module.exports = mongoose.model('User', UserSchema);