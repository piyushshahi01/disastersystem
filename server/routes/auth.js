const router = require('express').Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken'); // Keep JWT for session tracking
// REMOVE: const bcrypt = require('bcryptjs'); 
// REMOVE: const CryptoJS = require('crypto-js');

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, secretKey, phone, vehicleNumber } = req.body;
        // ... (Keep existing validation logic) ...

        // Save new user (password is saved as plain text now)
        const newUser = new User({ name, email, password, role, phone, vehicleNumber });
        await newUser.save();
        
        res.json({ success: true, message: "Account created! Please log in." });
    } catch (err) {
        // ... (Keep error handling) ...
        res.status(500).json({ message: "Internal Server Error during registration." });
    }
});

// LOGIN (PLAIN TEXT VERSION - STABLE)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        // 1. SIMPLE COMPARISON (CRITICAL STABILITY FIX)
        if (password !== user.password) return res.status(400).json({ message: "Invalid credentials" });

        // 2. Generate JWT Token
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' });

        res.json({ 
            success: true, 
            token,
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

// GET RESPONDERS (No changes needed)
router.get('/responders', async (req, res) => { /* ... */ });

module.exports = router;