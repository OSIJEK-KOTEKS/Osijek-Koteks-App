const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Registration route
router.post('/register', async (req, res) => {
  try {
    const {firstName, lastName, company, email, password, code, role} =
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
      code,
      role: role || 'user', // Default to 'user' if role is not provided
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user to database
    await user.save();

    // Create and return JWT token
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({message: 'Server error during registration'});
  }
});

// Existing login route
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      company,
      email,
      password,
      code,
      role,
      phoneNumber,
    } = req.body;

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
      code,
      role: role || 'user',
      phoneNumber: phoneNumber || undefined,
    });

    // Save user to database
    await user.save();

    // Create and return JWT token
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

module.exports = router;
