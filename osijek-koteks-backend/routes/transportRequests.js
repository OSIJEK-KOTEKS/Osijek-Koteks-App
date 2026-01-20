const express = require('express');
const router = express.Router();
const TransportRequest = require('../models/TransportRequest');
const auth = require('../middleware/auth');

// Create a new transport request (admin with prijevoz access only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    // Only admins can create transport requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create transport requests' });
    }

    const { kamenolom, gradiliste, brojKamiona, prijevozNaDan, isplataPoT } = req.body;

    // Validate required fields
    if (!kamenolom || !gradiliste || !brojKamiona || !prijevozNaDan || isplataPoT === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create new transport request
    const transportRequest = new TransportRequest({
      kamenolom,
      gradiliste,
      brojKamiona,
      prijevozNaDan,
      isplataPoT,
      userId: req.user._id,
      userEmail: req.user.email,
    });

    await transportRequest.save();

    res.status(201).json({
      message: 'Transport request created successfully',
      transportRequest,
    });
  } catch (error) {
    console.error('Error creating transport request:', error);
    res.status(500).json({
      message: 'Server error while creating transport request',
      error: error.message,
    });
  }
});

// Get all transport requests (users with canAccessPrijevoz can see all)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    const transportRequests = await TransportRequest.find({})
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email company');

    res.json(transportRequests);
  } catch (error) {
    console.error('Error fetching transport requests:', error);
    res.status(500).json({
      message: 'Server error while fetching transport requests',
      error: error.message,
    });
  }
});

// Get a single transport request by ID
router.get('/:id', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    const transportRequest = await TransportRequest.findById(req.params.id).populate(
      'userId',
      'firstName lastName email company'
    );

    if (!transportRequest) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    res.json(transportRequest);
  } catch (error) {
    console.error('Error fetching transport request:', error);
    res.status(500).json({
      message: 'Server error while fetching transport request',
      error: error.message,
    });
  }
});

// Update transport request (full update - admin with prijevoz access only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    // Only admins can update transport requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update transport requests' });
    }

    const transportRequest = await TransportRequest.findById(req.params.id);

    if (!transportRequest) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    const { kamenolom, gradiliste, brojKamiona, prijevozNaDan, isplataPoT } = req.body;

    // Validate required fields
    if (!kamenolom || !gradiliste || !brojKamiona || !prijevozNaDan || isplataPoT === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Update the transport request
    transportRequest.kamenolom = kamenolom;
    transportRequest.gradiliste = gradiliste;
    transportRequest.brojKamiona = brojKamiona;
    transportRequest.prijevozNaDan = prijevozNaDan;
    transportRequest.isplataPoT = isplataPoT;

    await transportRequest.save();

    res.json({
      message: 'Transport request updated successfully',
      transportRequest,
    });
  } catch (error) {
    console.error('Error updating transport request:', error);
    res.status(500).json({
      message: 'Server error while updating transport request',
      error: error.message,
    });
  }
});

// Update transport request status (admin with prijevoz access only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update request status' });
    }

    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const transportRequest = await TransportRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!transportRequest) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    res.json({
      message: 'Status updated successfully',
      transportRequest,
    });
  } catch (error) {
    console.error('Error updating transport request status:', error);
    res.status(500).json({
      message: 'Server error while updating status',
      error: error.message,
    });
  }
});

// Delete transport request (admin with prijevoz access only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    // Only admins can delete transport requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete transport requests' });
    }

    const transportRequest = await TransportRequest.findById(req.params.id);

    if (!transportRequest) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    await TransportRequest.findByIdAndDelete(req.params.id);

    res.json({ message: 'Transport request deleted successfully' });
  } catch (error) {
    console.error('Error deleting transport request:', error);
    res.status(500).json({
      message: 'Server error while deleting transport request',
      error: error.message,
    });
  }
});

module.exports = router;
