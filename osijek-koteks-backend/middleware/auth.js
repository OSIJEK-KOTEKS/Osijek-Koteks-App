const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
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
    console.log('Decoded token:', decoded); // Add logging

    // Add user info to request
    req.user = {
      _id: decoded.id, // Make sure this matches what we set in the token
      role: decoded.role,
    };

    console.log('User info added to request:', req.user); // Add logging
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({message: 'Token is not valid'});
  }
};

module.exports = auth;
