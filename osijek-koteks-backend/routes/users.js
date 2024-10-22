const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all users (protected, admin only)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({message: 'Access denied. Admin only.'});
  }

  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// Get user profile (protected)
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    // Users can only access their own profile unless they're an admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({message: 'Access denied'});
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;
