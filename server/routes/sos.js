const router = require('express').Router();
const SOS = require('../models/SOS');

// ALL SOS (for Admin stats, analytics, etc.)
router.get('/', async (req, res) => {
  try {
    const allSOS = await SOS.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.json(allSOS);
  } catch (err) {
    console.error('Error fetching all sos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ONLY ACTIVE SOS (optional – for responder map, etc.)
router.get('/active', async (req, res) => {
  try {
    const activeSOS = await SOS.find({ status: { $ne: 'resolved' } })
      .populate('user', 'name email');

    res.json(activeSOS);
  } catch (err) {
    console.error('Error fetching active sos:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
