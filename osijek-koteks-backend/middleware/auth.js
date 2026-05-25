const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { serviceAuthHeadersPresent, verifyServiceRequest } = require('../utils/serviceAuth');

const auth = async (req, res, next) => {
  try {
    if (serviceAuthHeadersPresent(req)) {
      return authenticateServiceRequest(req, res, next);
    }

    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Do not log the raw header value — it can contain a bearer token.
      console.log('No valid auth header found');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Get the token without 'Bearer '
    const token = authHeader.split(' ')[1];

    // Verify token (do not log the decoded payload)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and attach to request
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user to  request
    req.user = user;
    console.log('User authenticated:', {
      id: user._id,
      role: user.role,
      codes: user.codes.length,
    });

    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

async function authenticateServiceRequest(req, res, next) {
  try {
    const serviceClient = await verifyServiceRequest(req);
    const user = await User.findById(serviceClient.actorUserId);

    if (!user) {
      return res.status(401).json({ message: 'Service actor user not found' });
    }

    req.user = user;
    req.serviceClient = {
      clientId: serviceClient.clientId,
      actorUserId: serviceClient.actorUserId,
    };

    console.log('Service request authenticated:', {
      clientId: serviceClient.clientId,
      actorUserId: serviceClient.actorUserId,
      method: req.method,
      path: req.originalUrl,
    });

    next();
  } catch (err) {
    console.warn('Service authentication failed:', {
      code: err.code || 'service_auth_failed',
      method: req.method,
      path: req.originalUrl,
    });
    res.status(401).json({ message: 'Service authentication failed' });
  }
}

module.exports = auth;
