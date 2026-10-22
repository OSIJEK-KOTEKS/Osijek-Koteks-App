function requireServiceClient(req, res, next) {
  if (!req.serviceClient) {
    return res.status(401).json({ message: 'Service authentication required' });
  }
  next();
}

module.exports = requireServiceClient;
