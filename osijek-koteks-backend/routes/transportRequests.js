const express = require('express');
const router = express.Router();
const TransportRequest = require('../models/TransportRequest');
const TransportAcceptance = require('../models/TransportAcceptance');
const Item = require('../models/Item');
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

    const { kamenolom, gradiliste, brojKamiona, prijevozNaDan, isplataPoT, status } = req.body;

    // Validate required fields
    if (!kamenolom || !gradiliste || !brojKamiona || !prijevozNaDan || isplataPoT === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate status if provided
    if (status && !['Aktivno', 'Neaktivno'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Update the transport request
    transportRequest.kamenolom = kamenolom;
    transportRequest.gradiliste = gradiliste;
    transportRequest.brojKamiona = brojKamiona;
    transportRequest.prijevozNaDan = prijevozNaDan;
    transportRequest.isplataPoT = isplataPoT;
    if (status) {
      transportRequest.status = status;
    }

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

    if (!['Aktivno', 'Neaktivno'].includes(status)) {
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

// Get current user's own acceptances (for "Lista prijevoza" feature)
// IMPORTANT: This route must come before /:id/acceptances to avoid route conflicts
router.get('/acceptances/my', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    const acceptances = await TransportAcceptance.find({
      userId: req.user._id,
    })
      .populate('userId', 'firstName lastName email company')
      .populate('requestId', 'kamenolom gradiliste brojKamiona prijevozNaDan isplataPoT status createdAt')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Calculate total payout for each acceptance based on approved items
    const acceptancesWithPayout = await Promise.all(
      acceptances.map(async (acceptance) => {
        const acceptanceObj = acceptance.toObject();

        // Find all approved items linked to this acceptance
        const approvedItems = await Item.find({
          transportAcceptanceId: acceptance._id,
          approvalStatus: 'odobreno'
        });

        // Calculate total payout: sum of (isplataPoT * neto / 1000) for each approved item
        const isplataPoT = acceptance.requestId?.isplataPoT || 0;
        let ukupnaIsplata = 0;

        for (const item of approvedItems) {
          if (item.neto) {
            ukupnaIsplata += isplataPoT * (item.neto / 1000);
          }
        }

        acceptanceObj.ukupnaIsplata = Math.round(ukupnaIsplata * 100) / 100; // Round to 2 decimal places
        return acceptanceObj;
      })
    );

    res.json(acceptancesWithPayout);
  } catch (error) {
    console.error('Error fetching user acceptances:', error);
    res.status(500).json({
      message: 'Server error while fetching user acceptances',
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

// Get all acceptances for a transport request
router.get('/:id/acceptances', auth, async (req, res) => {
  try {
    // Check if user has canAccessPrijevoz permission
    if (!req.user.canAccessPrijevoz) {
      return res.status(403).json({ message: 'Access denied. Prijevoz access required.' });
    }

    // Build query based on user role
    const query = {
      requestId: req.params.id,
    };

    // If not admin, only show user's own acceptances
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    const acceptances = await TransportAcceptance.find(query)
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

// Get delivered count for a transport request
router.get('/:id/delivered-count', auth, async (req, res) => {
  try {
    // Get all approved acceptances for this request
    const approvedAcceptances = await TransportAcceptance.find({
      requestId: req.params.id,
      status: 'approved'
    });

    // Calculate total accepted count
    const totalAccepted = approvedAcceptances.reduce((sum, acceptance) => sum + acceptance.acceptedCount, 0);

    // Count how many items are linked and approved
    const deliveredCount = await Item.countDocuments({
      transportAcceptanceId: { $in: approvedAcceptances.map(a => a._id) },
      approvalStatus: 'odobreno'
    });

    res.json({
      delivered: deliveredCount,
      total: totalAccepted
    });
  } catch (error) {
    console.error('Error fetching delivered count:', error);
    res.status(500).json({
      message: 'Server error while fetching delivered count',
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

    // Check if this user has any active acceptances (pending or approved) with these registrations
    // that haven't been completed (turned green) yet
    const requestedFirstParts = registrations.map(reg => getFirstPartOfRegistration(reg));
    const uniqueRequestedFirstParts = [...new Set(requestedFirstParts)];

    console.log('=== ACCEPT VALIDATION DEBUG ===');
    console.log('User ID:', req.user._id);
    console.log('Requested registrations:', registrations);
    console.log('Requested first parts:', uniqueRequestedFirstParts);

    // Get all active acceptances for THIS USER (pending or approved, not declined)
    const userActiveAcceptances = await TransportAcceptance.find({
      userId: req.user._id,
      status: { $in: ['pending', 'approved'] }
    });

    console.log('User active acceptances count:', userActiveAcceptances.length);
    console.log('User active acceptances:', userActiveAcceptances.map(a => ({
      id: a._id,
      status: a.status,
      registrations: a.registrations
    })));

    // For each requested registration, check if it's currently busy for this user
    const busyRegistrations = [];

    for (const firstPart of uniqueRequestedFirstParts) {
      // Find this user's acceptances that contain this registration
      const acceptancesWithReg = userActiveAcceptances.filter(acc => {
        return acc.registrations.some(reg => getFirstPartOfRegistration(reg) === firstPart);
      });

      console.log(`Checking firstPart "${firstPart}": found in ${acceptancesWithReg.length} acceptances`);

      if (acceptancesWithReg.length > 0) {
        // Check if ANY of these acceptances has a completed (approved) item for this registration
        const acceptanceIds = acceptancesWithReg.map(acc => acc._id);

        const completedItem = await Item.findOne({
          transportAcceptanceId: { $in: acceptanceIds },
          approvalStatus: 'odobreno',
          registracija: { $regex: new RegExp('^' + firstPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        });

        console.log(`Completed item for "${firstPart}":`, completedItem ? 'FOUND' : 'NOT FOUND');

        // If no completed item found, this registration is still busy for this user
        if (!completedItem) {
          busyRegistrations.push(firstPart);
        }
      }
    }

    console.log('Busy registrations:', busyRegistrations);
    console.log('=== END DEBUG ===');

    if (busyRegistrations.length > 0) {
      return res.status(400).json({
        message: 'Neke registracije su još uvijek u upotrebi i nisu dovršene',
        overlappingRegistrations: busyRegistrations
      });
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
      gradiliste: transportRequest.gradiliste,
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
