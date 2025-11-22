const router = require('express').Router();
const Shelter = require('../models/Shelter');

// GET ALL SHELTERS
router.get('/', async (req, res) => {
    try {
        const shelters = await Shelter.find();
        res.json(shelters);
    } catch (err) {
        res.status(500).json(err);
    }
});

// ADD NEW SHELTER
router.post('/', async (req, res) => {
    const newShelter = new Shelter(req.body);
    try {
        const savedShelter = await newShelter.save();
        res.status(200).json(savedShelter);
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE SHELTER
router.put('/:id', async (req, res) => {
    try {
        const updatedShelter = await Shelter.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true }
        );
        res.status(200).json(updatedShelter);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE SHELTER
router.delete('/:id', async (req, res) => {
    try {
        await Shelter.findByIdAndDelete(req.params.id);
        res.status(200).json("Shelter has been deleted...");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;