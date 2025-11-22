const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // Needed for password comparison
const jwt = require('jsonwebtoken'); // Needed for session management

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, secretKey, phone, vehicleNumber } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        if (role !== 'citizen') {
            const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin123";
            const RESPONDER_SECRET = process.env.RESPONDER_SECRET || "rescue2025";
            if (role === 'admin' && secretKey !== ADMIN_SECRET) return res.status(403).json({ message: "Invalid Admin Code" });
            if (role === 'responder' && secretKey !== RESPONDER_SECRET) return res.status(403).json({ message: "Invalid Responder Code" });
        }

        // Mongoose pre-save hook in User.js will hash the password now
        const newUser = new User({ name, email, password, role, phone, vehicleNumber });
        await newUser.save();
        
        res.json({ success: true, message: "Account created! Please log in." });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Internal Server Error during registration." });
    }
});

// LOGIN (SECURE VERSION)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        // 1. Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // 2. Generate JWT Token
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' });

        res.json({ 
            success: true, 
            token, // Return the token the frontend expects
            user: { 
                id: user._id, 
                name: user.name, 
                role: user.role,
                phone: user.phone,
                vehicleNumber: user.vehicleNumber
            } 
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Internal Server Error during login." });
    }
});

// GET RESPONDERS (For Admin Dashboard)
router.get('/responders', async (req, res) => {
    try {
        const responders = await User.find({ role: 'responder' }).select('-password');
        res.json(responders);
    } catch (err) {
        console.error("Responder Fetch Error:", err);
        res.status(500).json({ message: "Internal Server Error fetching responders." });
    }
});

module.exports = router;