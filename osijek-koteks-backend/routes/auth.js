const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login route
router.post('/login', async (req, res) => {
  try {
    const {email, password} = req.body;
    const user = await User.findOne({email});

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({message: 'Invalid credentials'});
    }

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({token, user: {id: user._id, email: user.email, role: user.role}});
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;
