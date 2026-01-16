const express = require('express');
const router = express.Router();
const TransportRequest = require('../models/TransportRequest');
const auth = require('../middleware/auth');

// Create a new transport request
router.post('/', auth, async (req, res) => {
  try {
    const { kamenolom, gradiliste, brojKamiona, prijevozNaDan } = req.body;

    // Validate required fields
    if (!kamenolom || !gradiliste || !brojKamiona || !prijevozNaDan) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create new transport request
    const transportRequest = new TransportRequest({
      kamenolom,
      gradiliste,
      brojKamiona,
      prijevozNaDan,
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

// Get all transport requests (admin can see all, users see only their own)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    // If not admin, only show user's own requests
    if (req.user.role !== 'admin') {
      query.userId = req.user._id.toString();
    }

    const transportRequests = await TransportRequest.find(query)
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
    const transportRequest = await TransportRequest.findById(req.params.id).populate(
      'userId',
      'firstName lastName email company'
    );

    if (!transportRequest) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    // Check if user has permission to view this request
    if (req.user.role !== 'admin' && transportRequest.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
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

// Update transport request status (admin only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
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

// Delete transport request
router.delete('/:id', auth, async (req, res) => {
  try {
    const transportRequest = await TransportRequest.findById(req.params.id);

    if (!transportRequest) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    // Only admin or the owner can delete
    if (req.user.role !== 'admin' && transportRequest.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
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
