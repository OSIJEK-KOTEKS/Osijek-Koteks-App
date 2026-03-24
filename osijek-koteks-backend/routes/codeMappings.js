const express = require('express');
const router = express.Router();
const CodeMapping = require('../models/CodeMapping');
const auth = require('../middleware/auth');

// GET all code mappings (all authenticated users)
router.get('/', auth, async (req, res) => {
  try {
    const mappings = await CodeMapping.find().sort({ code: 1 });
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching code mappings:', error);
    res.status(500).json({ message: 'Server error while fetching code mappings', error: error.message });
  }
});

// POST create or update a code mapping (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { code, name } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Code is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const existing = await CodeMapping.findOne({ code: code.trim() });
    if (existing) {
      existing.name = name.trim();
      existing.updatedBy = req.user._id;
      await existing.save();
      return res.json(existing);
    }

    const mapping = new CodeMapping({
      code: code.trim(),
      name: name.trim(),
      createdBy: req.user._id,
    });

    await mapping.save();
    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating code mapping:', error);
    res.status(500).json({ message: 'Server error while creating code mapping', error: error.message });
  }
});

// POST bulk seed (admin only) — upserts many entries at once
router.post('/bulk', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { mappings } = req.body; // [{ code, name }]

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ message: 'mappings array is required' });
    }

    const ops = mappings.map(({ code, name }) => ({
      updateOne: {
        filter: { code: code.trim() },
        update: {
          $set: { name: name.trim(), updatedBy: req.user._id },
          $setOnInsert: { createdBy: req.user._id },
        },
        upsert: true,
      },
    }));

    const result = await CodeMapping.bulkWrite(ops);
    res.json({
      message: 'Bulk upsert complete',
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error bulk upserting code mappings:', error);
    res.status(500).json({ message: 'Server error during bulk upsert', error: error.message });
  }
});

// PUT update a single mapping by id (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const mapping = await CodeMapping.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), updatedBy: req.user._id },
      { new: true }
    );

    if (!mapping) {
      return res.status(404).json({ message: 'Code mapping not found' });
    }

    res.json(mapping);
  } catch (error) {
    console.error('Error updating code mapping:', error);
    res.status(500).json({ message: 'Server error while updating code mapping', error: error.message });
  }
});

// DELETE a mapping (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const mapping = await CodeMapping.findByIdAndDelete(req.params.id);
    if (!mapping) {
      return res.status(404).json({ message: 'Code mapping not found' });
    }

    res.json({ message: 'Code mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting code mapping:', error);
    res.status(500).json({ message: 'Server error while deleting code mapping', error: error.message });
  }
});

module.exports = router;
