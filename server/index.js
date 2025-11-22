const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth');
const shelterRoutes = require('./routes/shelters');
const sosRoutes = require('./routes/sos');
const Sos = require('./models/SOS');
const User = require('./models/User'); 
const Message = require('./models/Message'); 
const MissingPerson = require('./models/MissingPerson'); 

dotenv.config();
const app = express();

// --- FIX 1: ALLOW ALL ORIGINS FOR API CALLS ---
app.use(cors({
  origin: "*", // Allow connections from Vercel, Localhost, Mobile, etc.
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/sos', sosRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

const server = http.createServer(app);

// --- FIX 2: ALLOW ALL ORIGINS FOR SOCKET.IO ---
const io = new Server(server, {
  cors: { 
    origin: "*", // Allow Socket connections from anywhere
    methods: ["GET", "POST"] 
  }
});

const sendMockSMS = (name, phone, message) => {
    console.log(`\n📱 [SMS] To ${name} (${phone}): "${message}"\n`);
};

io.on('connection', (socket) => {
  console.log(`User: ${socket.id}`);

  socket.on('send_sos', async (data) => {
    const { userId, location, description, type, image } = data;
    const newSos = new Sos({ user: userId, location, description, type, image });
    await newSos.save();
    const user = await User.findById(userId);
    
    if (user) {
        const populatedSos = await newSos.populate('user', 'name phone');
        io.emit('new_sos', populatedSos);
        
        if (user.emergencyContacts && user.emergencyContacts.length > 0) {
            const mapLink = `http://googleusercontent.com/maps.google.com/4{location.lat},${location.lng}`;
            user.emergencyContacts.forEach(c => sendMockSMS(c.name, c.phone, `SOS! ${user.name} needs help. ${mapLink}`));
        }
    }
  });

  // --- CHAT LOGIC ---
  socket.on("join_room", async (room) => {
      socket.join(room);
      try {
          const history = await Message.find({ room }).sort({ createdAt: 1 }).limit(50);
          socket.emit("load_messages", history); 
      } catch (err) { console.error(err); }
  });

  socket.on("send_message", async (data) => {
      try {
          const newMsg = new Message(data);
          await newMsg.save();
      } catch(err) { console.error(err); }
      socket.to(data.room).emit("receive_message", data);
  });

  // --- MISSING PERSONS BOARD LOGIC ---
  socket.on('report_missing', async (data) => {
      try {
          const newReport = new MissingPerson(data);
          await newReport.save();
          io.emit('new_missing_person', newReport);
      } catch (err) { console.error(err); }
  });

  socket.on('get_missing_people', async () => {
      try {
          const list = await MissingPerson.find({ status: 'approved' }).sort({ createdAt: -1 });
          socket.emit('load_missing_people', list);
      } catch (err) { console.error(err); }
  });

  socket.on('add_missing_comment', async ({ personId, user, text }) => {
      try {
          const person = await MissingPerson.findById(personId);
          if(person) {
              person.comments.push({ user, text });
              await person.save();
              io.emit('update_missing_person', person); 
          }
      } catch (err) { console.error(err); }
  });

  socket.on('volunteer_status_change', async ({ userId, isVolunteer }) => {
      await User.findByIdAndUpdate(userId, { isVolunteer });
      io.emit('volunteer_update', { userId, isVolunteer });
  });

  // --- SHELTER MANAGEMENT ---
  socket.on('add_shelter', async (data) => {
    const Shelter = require('./models/Shelter');
    const newShelter = new Shelter({ name: data.name, location: { lat: data.lat, lng: data.lng }, capacity: data.capacity });
    await newShelter.save();
    io.emit('new_shelter', { ...newShelter._doc, lat: data.lat, lng: data.lng });
  });

  socket.on('book_beds', async ({ shelterId, count }) => {
      try {
          const Shelter = require('./models/Shelter');
          const shelter = await Shelter.findById(shelterId);
          if (shelter) {
              if (shelter.capacity >= count) {
                  shelter.capacity -= parseInt(count);
                  await shelter.save();
                  io.emit('shelter_updated', shelter);
                  socket.emit('booking_success', { name: shelter.name, booked: count });
              } else {
                  socket.emit('booking_error', { message: 'Not enough beds available!' });
              }
          }
      } catch (err) {
          console.error(err);
          socket.emit('booking_error', { message: 'Server error' });
      }
  });

  socket.on('send_alert', (data) => { io.emit('receive_alert', data); });
  socket.on('delete_alert', () => { io.emit('clear_alerts'); });

  socket.on('resolve_sos', async ({ sosId }) => {
      await Sos.findByIdAndUpdate(sosId, { status: 'resolved' });
      io.emit('sos_status_update', { sosId, status: 'resolved' });
  });

  socket.on('accept_sos', async ({ sosId, responderId }) => {
      await Sos.findByIdAndUpdate(sosId, { status: 'assigned', assignedTo: responderId });
      const responder = await User.findById(responderId);
      io.emit('sos_status_update', { sosId, status: 'assigned', responderId, responderDetails: { name: responder.name, phone: responder.phone, vehicle: 'Rescue-1' } });
  });

  socket.on('responder_location_update', (data) => io.emit('live_responder_location', data));
});

server.listen(5000, () => console.log("🚀 SERVER RUNNING ON PORT 5000"));