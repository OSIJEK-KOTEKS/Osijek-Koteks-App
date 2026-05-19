const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    // Public registration is disabled by default. Privileged users are
    // created via the admin-only /api/users route.
    if (process.env.ENABLE_PUBLIC_REGISTRATION !== 'true') {
      return res.status(403).json({ message: 'Public registration is disabled' });
    }

    console.log('Registration attempt for email:', req.body && req.body.email);

    // Only accept non-privileged fields from the public request body.
    // Permission/role fields are never honored here.
    const { firstName, lastName, company, email, password } = req.body;

    // Check if user already  exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user with hardcoded safe defaults. No privilege
    // escalation possible via the public endpoint.
    user = new User({
      firstName,
      lastName,
      company,
      email,
      password, // Will be hashed by the pre-save middleware
      role: 'user',
      isVerified: false,
      hasFullAccess: false,
      canAccessRacuni: false,
      canAccessPrijevoz: false,
      codes: [],
      assignedRegistrations: [],
    });

    // Save user to database
    await user.save();

    // Create and return JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('Registration successful for:', email);

    // Return response
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        codes: user.codes,
        role: user.role,
        isVerified: user.isVerified,
        hasFullAccess: user.hasFullAccess,
        canAccessRacuni: user.canAccessRacuni,
        canAccessPrijevoz: user.canAccessPrijevoz,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        details: error.message,
      });
    }
    res.status(500).json({
      message: 'Server error during registration',
      error: error.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id, // This should match what we check in auth middleware
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Log successful login
    console.log('Login successful for user:', {
      id: user._id,
      role: user.role,
      email: user.email,
    });

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        codes: user.codes,
        role: user.role,
        isVerified: user.isVerified,
        hasFullAccess: user.hasFullAccess,
        canAccessRacuni: user.canAccessRacuni,
        canAccessPrijevoz: user.canAccessPrijevoz,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
