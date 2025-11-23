const router = require('express').Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, secretKey, phone, vehicleNumber } = req.body;
    // ...your existing validation logic...

    const newUser = new User({ name, email, password, role, phone, vehicleNumber });
    await newUser.save();

    res.json({ success: true, message: "Account created! Please log in." });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: "Internal Server Error during registration." });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (password !== user.password) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_default_secret',
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Internal Server Error during login." });
  }
});

// ✅ GET RESPONDERS
router.get('/responders', async (req, res) => {
  try {
    const responders = await User.find({ role: 'responder' }).select('-password');
    res.json(responders);
  } catch (err) {
    console.error('Error fetching responders:', err);
    res.status(500).json({ message: 'Error fetching responders' });
  }
});

module.exports = router;
