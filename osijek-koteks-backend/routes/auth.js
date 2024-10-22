const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Login route with enhanced debugging
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

    console.log('User found:', {
      id: user._id,
      email: user.email,
      passwordLength: user.password?.length || 0,
    });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);

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

    console.log('Login successful for user:', email);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        code: user.code,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      email: req.body.email,
    });
    res.status(500).json({message: 'Server error during login'});
  }
});

// Utility route to verify password hash
router.post('/verify-password', async (req, res) => {
  try {
    const {email, password} = req.body;

    const user = await User.findOne({email});
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    const passwordInfo = {
      storedHashLength: user.password?.length || 0,
      isValidHash: user.password?.startsWith('$2') || false,
      providedPasswordLength: password?.length || 0,
    };

    res.json({passwordInfo});
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({message: 'Error verifying password'});
  }
});

// Utility route to reset password
router.post('/reset-password', async (req, res) => {
  try {
    const {email, newPassword} = req.body;

    const user = await User.findOne({email});
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    res.json({message: 'Password reset successful'});
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({message: 'Error resetting password'});
  }
});

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
      role: role || 'user',
    });

    // Password is hashed via the mongoose pre-save middleware

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

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        code: user.code,
        role: user.role,
        isVerified: user.isVerified,
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
