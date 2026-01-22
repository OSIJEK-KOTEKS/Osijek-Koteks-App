const express = require('express');
const router = express.Router();
const TransportRequest = require('../models/TransportRequest');
const TransportAcceptance = require('../models/TransportAcceptance');
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

    const { kamenolom, gradiliste, brojKamiona, prijevozNaDan, isplataPoT, assignedTo } = req.body;

    // Validate required fields
    if (!kamenolom || !gradiliste || !brojKamiona || !prijevozNaDan || isplataPoT === undefined || !assignedTo) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate assignedTo field
    if (assignedTo !== 'All' && (!Array.isArray(assignedTo) || assignedTo.length === 0)) {
      return res.status(400).json({ message: 'assignedTo must be "All" or an array of user IDs' });
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
      assignedTo,
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

// Get all pending acceptances across all requests (admin only)
// IMPORTANT: This route must come before /:id/acceptances to avoid route conflicts
router.get('/acceptances/pending', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission and is admin
    if (!req.user.canAccessPrijevoz || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const acceptances = await TransportAcceptance.find({
      status: 'pending',
    })
      .populate('userId', 'firstName lastName email company')
      .populate('requestId')
      .sort({ createdAt: -1 });

    res.json(acceptances);
  } catch (error) {
    console.error('Error fetching pending acceptances:', error);
    res.status(500).json({
      message: 'Server error while fetching pending acceptances',
      error: error.message,
    });
  }
});

// Admin approves or declines an acceptance
router.patch('/acceptances/:acceptanceId', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission and is admin
    if (!req.user.canAccessPrijevoz || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { status } = req.body;

    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either "approved" or "declined"' });
    }

    const acceptance = await TransportAcceptance.findById(req.params.acceptanceId).populate('requestId');

    if (!acceptance) {
      return res.status(404).json({ message: 'Acceptance not found' });
    }

    if (acceptance.status !== 'pending') {
      return res.status(400).json({ message: 'This acceptance has already been reviewed' });
    }

    // Update acceptance status
    acceptance.status = status;
    acceptance.reviewedBy = req.user._id;
    acceptance.reviewedAt = new Date();
    await acceptance.save();

    // If approved, reduce brojKamiona in the transport request
    if (status === 'approved') {
      const transportRequest = await TransportRequest.findById(acceptance.requestId._id);
      if (transportRequest) {
        transportRequest.brojKamiona = Math.max(0, transportRequest.brojKamiona - acceptance.acceptedCount);
        await transportRequest.save();
      }
    }

    // Populate the acceptance for response
    await acceptance.populate('userId', 'firstName lastName email company');
    await acceptance.populate('reviewedBy', 'firstName lastName email');

    res.json({
      message: `Acceptance ${status} successfully`,
      acceptance,
    });
  } catch (error) {
    console.error('Error reviewing acceptance:', error);
    res.status(500).json({
      message: 'Server error while reviewing acceptance',
      error: error.message,
    });
  }
});

// Get all pending acceptances for a transport request (admin only)
router.get('/:id/acceptances', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission and is admin
    if (!req.user.canAccessPrijevoz || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const acceptances = await TransportAcceptance.find({
      requestId: req.params.id,
    })
      .populate('userId', 'firstName lastName email company')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(acceptances);
  } catch (error) {
    console.error('Error fetching acceptances:', error);
    res.status(500).json({
      message: 'Server error while fetching acceptances',
      error: error.message,
    });
  }
});

// Helper function to extract first part of registration (same logic as frontend)
const getFirstPartOfRegistration = (registration) => {
  // Pattern 1: With spaces - "PŽ 995 FD", "SB 004 NP", "NA 224 O"
  const withSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\s+\d+\s+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
  if (withSpaces) return withSpaces[1];

  // Pattern 2: Without spaces - "NG341CP", "AB123CD"
  const withoutSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\d+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
  if (withoutSpaces) return withoutSpaces[1];

  // Fallback: return original if no pattern matches
  return registration;
};

// User accepts transport request with registrations
router.post('/:id/accept', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    const { registrations } = req.body;

    if (!registrations || !Array.isArray(registrations) || registrations.length === 0) {
      return res.status(400).json({ message: 'Registrations array is required' });
    }

    // Check if transport request exists
    const transportRequest = await TransportRequest.findById(req.params.id);
    if (!transportRequest) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    // Check if user has already submitted an acceptance for this request with the same registrations
    const existingAcceptances = await TransportAcceptance.find({
      requestId: req.params.id,
      userId: req.user._id,
    });

    // Sort the new registrations for comparison
    const newRegistrationsSorted = [...registrations].sort();

    // Check if any existing acceptance has identical registrations
    for (const existingAcceptance of existingAcceptances) {
      const existingRegistrationsSorted = [...existingAcceptance.registrations].sort();

      // Check if the registrations arrays are identical
      const areRegistrationsIdentical =
        existingRegistrationsSorted.length === newRegistrationsSorted.length &&
        existingRegistrationsSorted.every((reg, index) => reg === newRegistrationsSorted[index]);

      if (areRegistrationsIdentical) {
        return res.status(400).json({
          message: 'You have already submitted an acceptance for this request with the same registrations'
        });
      }
    }

    // Calculate accepted count based on unique first parts (each unique first part = 1 truck)
    const firstParts = registrations.map(reg => getFirstPartOfRegistration(reg));
    const uniqueFirstParts = [...new Set(firstParts)];
    const acceptedCount = uniqueFirstParts.length;

    // Create acceptance record
    const acceptance = new TransportAcceptance({
      requestId: req.params.id,
      userId: req.user._id,
      registrations,
      acceptedCount: acceptedCount,
      status: 'pending',
    });

    await acceptance.save();

    res.status(201).json({
      message: 'Transport request acceptance submitted successfully',
      acceptance,
    });
  } catch (error) {
    console.error('Error accepting transport request:', error);
    res.status(500).json({
      message: 'Server error while accepting transport request',
      error: error.message,
    });
  }
});

module.exports = router;
