const router = require('express').Router();
const User = require('../models/User');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    // Accept phone and vehicleNumber from frontend
    const { name, email, password, role, secretKey, phone, vehicleNumber } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    if (role !== 'citizen') {
      const ADMIN_SECRET = "admin123";
      const RESPONDER_SECRET = "rescue2025";
      if (role === 'admin' && secretKey !== ADMIN_SECRET) return res.status(403).json({ message: "Invalid Admin Code" });
      if (role === 'responder' && secretKey !== RESPONDER_SECRET) return res.status(403).json({ message: "Invalid Responder Code" });
    }

    // Save new fields (phone, vehicleNumber)
    const newUser = new User({ name, email, password, role, phone, vehicleNumber });
    await newUser.save();
    
    res.json({ success: true, message: "Account created!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) return res.status(400).json({ message: "Invalid credentials" });

    // Return phone/vehicle in login response too (Important for UI)
    res.json({ 
      success: true, 
      user: { 
        id: user._id, 
        name: user.name, 
        role: user.role,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET RESPONDERS (For Admin Dashboard)
router.get('/responders', async (req, res) => {
  try {
    const responders = await User.find({ role: 'responder' }).select('-password');
    res.json(responders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;