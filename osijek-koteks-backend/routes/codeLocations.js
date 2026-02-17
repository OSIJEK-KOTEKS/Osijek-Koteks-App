const express = require('express');
const router = express.Router();
const CodeLocation = require('../models/CodeLocation');
const auth = require('../middleware/auth');

// Get all code locations (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const codeLocations = await CodeLocation.find().sort({ code: 1 });
    res.json(codeLocations);
  } catch (error) {
    console.error('Error fetching code locations:', error);
    res.status(500).json({ message: 'Server error while fetching code locations', error: error.message });
  }
});

// Create or update a code location (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { code, location } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Code is required' });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({ message: 'Location is required' });
    }

    const existing = await CodeLocation.findOne({ code: code.trim() });
    if (existing) {
      existing.location = location.trim();
      await existing.save();
      return res.json(existing);
    }

    const codeLocation = new CodeLocation({
      code: code.trim(),
      location: location.trim(),
      createdBy: req.user._id,
    });

    await codeLocation.save();
    res.status(201).json(codeLocation);
  } catch (error) {
    console.error('Error creating code location:', error);
    res.status(500).json({ message: 'Server error while creating code location', error: error.message });
  }
});

// Update a code location (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { location } = req.body;

    if (!location || !location.trim()) {
      return res.status(400).json({ message: 'Location is required' });
    }

    const codeLocation = await CodeLocation.findByIdAndUpdate(
      req.params.id,
      { location: location.trim() },
      { new: true }
    );

    if (!codeLocation) {
      return res.status(404).json({ message: 'Code location not found' });
    }

    res.json(codeLocation);
  } catch (error) {
    console.error('Error updating code location:', error);
    res.status(500).json({ message: 'Server error while updating code location', error: error.message });
  }
});

// Delete a code location (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const codeLocation = await CodeLocation.findByIdAndDelete(req.params.id);

    if (!codeLocation) {
      return res.status(404).json({ message: 'Code location not found' });
    }

    res.json({ message: 'Code location deleted successfully' });
  } catch (error) {
    console.error('Error deleting code location:', error);
    res.status(500).json({ message: 'Server error while deleting code location', error: error.message });
  }
});

module.exports = router;
