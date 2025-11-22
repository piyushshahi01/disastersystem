const mongoose = require('mongoose');

const shelterSchema = new mongoose.Schema({
  name: String,
  location: {
    lat: Number,
    lng: Number
  },
  capacity: Number,
  type: { type: String, default: 'shelter' } // shelter, medical, food
});

module.exports = mongoose.model('Shelter', shelterSchema);