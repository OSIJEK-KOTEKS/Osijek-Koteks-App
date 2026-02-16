const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth');

// Get all groups (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const groups = await Group.find()
      .populate('users', 'firstName lastName email company')
      .populate('createdBy', 'firstName lastName email')
      .sort({ name: 1 });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Server error while fetching groups', error: error.message });
  }
});

// Create a group (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const existing = await Group.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Grupa s tim imenom već postoji' });
    }

    const group = new Group({
      name: name.trim(),
      users: [],
      createdBy: req.user._id,
    });

    await group.save();
    await group.populate('createdBy', 'firstName lastName email');

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Server error while creating group', error: error.message });
  }
});

// Update group name (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    )
      .populate('users', 'firstName lastName email company')
      .populate('createdBy', 'firstName lastName email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Server error while updating group', error: error.message });
  }
});

// Delete group (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const group = await Group.findByIdAndDelete(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Server error while deleting group', error: error.message });
  }
});

// Set users for a group (admin only)
router.patch('/:id/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds must be an array' });
    }

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { users: userIds },
      { new: true }
    )
      .populate('users', 'firstName lastName email company')
      .populate('createdBy', 'firstName lastName email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error updating group users:', error);
    res.status(500).json({ message: 'Server error while updating group users', error: error.message });
  }
});

module.exports = router;
