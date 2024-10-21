// In your users.js route file

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all users (protected, admin only)
router.get('/', auth, async (req, res) => {
  // Check if the user is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({message: 'Access denied. Admin only.'});
  }

  try {
    const users = await User.find().select('-password'); // Exclude password field
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;
