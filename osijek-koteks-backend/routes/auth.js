const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/login', async (req, res) => {
  try {
    const {email, password} = req.body;
    console.log('Login attempt for email:', email);

    const user = await User.findOne({email});
    if (!user) {
      return res.status(400).json({message: 'Invalid credentials'});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({message: 'Invalid credentials'});
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id, // This should match what we check in auth middleware
        role: user.role,
      },
      process.env.JWT_SECRET,
      {expiresIn: '1d'},
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
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({message: 'Server error during login'});
  }
});

module.exports = router;
