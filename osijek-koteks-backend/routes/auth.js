const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Registration route
router.post('/register', async (req, res) => {
  try {
    const {firstName, lastName, company, email, password, codes, role} =
      req.body;

    // Check if user already exists
    let user = await User.findOne({email});
    if (user) {
      return res.status(400).json({message: 'User already exists'});
    }

    // Create new user
    user = new User({
      firstName,
      lastName,
      company,
      email,
      password,
      codes: codes || [], // Ensure codes are included
      role: role || 'user',
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
      {expiresIn: '1d'},
    );

    // Return response including the codes
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        codes: user.codes, // Include codes in response
        role: user.role,
        isVerified: user.isVerified,
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const {email, password} = req.body;
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      console.log('Missing credentials - Email or password not provided');
      return res
        .status(400)
        .json({message: 'Please provide all required fields'});
    }

    // Find user by email
    const user = await User.findOne({email});
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({message: 'Invalid credentials'});
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({message: 'Invalid credentials'});
    }

    // Create and return JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {expiresIn: '1d'},
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        codes: user.codes, // Include codes in response
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error details:', error);
    res.status(500).json({message: 'Server error during login'});
  }
});

module.exports = router;
