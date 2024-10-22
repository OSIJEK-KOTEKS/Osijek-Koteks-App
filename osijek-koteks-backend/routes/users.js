const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Validate 5-digit code format
const validateCode = code => /^\d{5}$/.test(code);

// Get all users (admin only)
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

// Get user profile
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

// Update user codes (admin only)
router.patch('/:id/codes', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const {codes} = req.body;

    // Validate input
    if (!Array.isArray(codes)) {
      return res.status(400).json({message: 'Codes must be an array'});
    }

    // Validate each code format
    if (!codes.every(validateCode)) {
      return res
        .status(400)
        .json({message: 'Each code must be exactly 5 digits'});
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    // Update codes
    user.codes = [...new Set(codes)]; // Remove duplicates
    await user.save();

    res.json({
      message: 'User codes updated successfully',
      codes: user.codes,
    });
  } catch (error) {
    console.error('Error updating user codes:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({message: error.message});
    }
    res.status(500).json({message: 'Server error'});
  }
});

// Update user profile (partial update)
router.patch('/:id', auth, async (req, res) => {
  try {
    // Users can only update their own profile unless they're an admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({message: 'Access denied'});
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    // Fields that can be updated
    const updatableFields = ['firstName', 'lastName', 'company', 'phoneNumber'];

    // Admin can also update these fields
    if (req.user.role === 'admin') {
      updatableFields.push('role', 'isVerified');
    }

    // Update allowed fields
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();
    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({message: error.message});
    }
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;
