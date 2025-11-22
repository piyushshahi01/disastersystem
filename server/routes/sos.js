const router = require('express').Router();
const SOS = require('../models/SOS');

// Get all active SOS
router.get('/', async (req, res) => {
  try {
    const activeSOS = await SOS.find({ status: { $ne: 'resolved' } })
      .populate('user', 'name email');
    res.json(activeSOS);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;