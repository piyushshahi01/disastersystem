const mongoose = require('mongoose');

const SosSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    lat: Number,
    lng: Number
  },
  status: { type: String, default: 'pending' }, // pending, assigned, resolved
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Responder' },
  description: String,
  type: { type: String, default: 'EMERGENCY' }, // EMERGENCY or INCIDENT
  image: { type: String }, // <--- THIS LINE IS REQUIRED TO SAVE THE IMAGE
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sos', SosSchema);