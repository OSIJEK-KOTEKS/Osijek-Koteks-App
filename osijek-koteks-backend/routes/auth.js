const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/login', async (req, res) => {
  try {
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if (!user) {
      return res.status(400).json({message: 'Invalid credentials'});
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({message: 'Invalid credentials'});
    }
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
    res.json({token, user: {id: user._id, email: user.email, role: user.role}});
  } catch (error) {
    console.error(error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;
