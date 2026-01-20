const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users with prijevoz access (admin only)
router.get('/prijevoz/access', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    const users = await User.find({ canAccessPrijevoz: true }).select('firstName lastName _id');
    res.json(users);
  } catch (error) {
    console.error('Error fetching prijevoz users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Fetching user profile:', req.params.id);

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      console.log('User not found:', req.params.id);
      return res.status(404).json({ message: 'User not found' });
    }

    // Users can only access their own profile unless they're an admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      console.log('Access denied for user:', req.user._id, 'trying to access:', req.params.id);
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('User profile found:', {
      id: user._id,
      email: user.email,
      role: user.role,
    });

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user codes (admin only)
router.patch('/:id/codes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { codes } = req.body;
    console.log('Updating codes for user:', req.params.id, 'New codes:', codes);

    if (!Array.isArray(codes)) {
      return res.status(400).json({ message: 'Codes must be an array' });
    }

    // Filter out empty strings and validate each code
    const validCodes = codes.filter(code => code.trim()).map(code => code.trim());

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.codes = [...new Set(validCodes)]; // Remove duplicates
    const updatedUser = await user.save();

    console.log('Successfully updated user codes:', {
      userId: user._id,
      newCodes: user.codes,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user codes:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});
router.patch('/:id/password', auth, async (req, res) => {
  try {
    // Only admins can change other users' passwords
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = req.body.password; // Password will be hashed by the pre-save middleware
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatableFields = ['firstName', 'lastName', 'company', 'phoneNumber'];
    if (req.user.role === 'admin') {
      // Admin can manage additional fields
      updatableFields.push('role', 'isVerified', 'codes', 'hasFullAccess', 'canAccessRacuni', 'canAccessPrijevoz');
    }

    // Update allowed fields
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    const updatedUser = await user.save();
    console.log('Updated user:', updatedUser); // Add this log
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    console.log('Creating new user:', {
      ...req.body,
      password: '[REDACTED]',
    });

    const { firstName, lastName, company, email, password, codes, role, canAccessRacuni, canAccessPrijevoz } =
      req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      company,
      email,
      password, // Will be hashed by the pre-save middleware
      codes: codes || [],
      role: role || 'user',
      isVerified: false,
      hasFullAccess: req.body.hasFullAccess || false,
      canAccessRacuni: canAccessRacuni || false,
      canAccessPrijevoz: canAccessPrijevoz || false,
    });

    await user.save();

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');
    console.log('User created successfully:', {
      userId: user._id,
      email: user.email,
    });

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        details: error.message,
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});
// Delete user (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
