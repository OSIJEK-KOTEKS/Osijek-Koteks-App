// In auth.js middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header found:', authHeader);
      return res.status(401).json({message: 'No token, authorization denied'});
    }

    // Get the token without 'Bearer '
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // Find user and attach to request
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({message: 'User not found'});
    }

    // Add user to request
    req.user = user;
    console.log('User authenticated:', {
      id: user._id,
      role: user.role,
      codes: user.codes.length,
    });

    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({message: 'Token is not valid'});
  }
};

module.exports = auth;
