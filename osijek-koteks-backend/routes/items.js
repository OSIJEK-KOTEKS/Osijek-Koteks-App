const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Validate 5-digit code format
const validateCode = code => /^\d{5}$/.test(code);

// Get items by user's codes
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching items for user:', req.user._id);

    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('User not found with ID:', req.user._id);
      return res.status(404).json({message: 'User not found'});
    }

    console.log('Found user:', {
      id: user._id,
      role: user.role,
      codes: user.codes,
    });

    // If user is admin, they can see all items
    const query = user.role === 'admin' ? {} : {code: {$in: user.codes}};

    // Add date range filter if provided
    if (req.query.startDate && req.query.endDate) {
      query.creationDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    console.log('Query:', JSON.stringify(query));

    const items = await Item.find(query)
      .sort({creationDate: -1})
      .populate('approvedBy', 'firstName lastName');

    console.log(`Found ${items.length} items`);
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({message: 'Server error', error: err.message});
  }
});

// Create a new item (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const {title, code, pdfUrl, creationDate} = req.body;

    if (!validateCode(code)) {
      return res.status(400).json({message: 'Code must be exactly 5 digits'});
    }

    const item = new Item({
      title,
      code,
      pdfUrl,
      creationDate: creationDate ? new Date(creationDate) : new Date(),
      approvalStatus: 'pending',
    });

    const newItem = await item.save();
    res.status(201).json(newItem);
  } catch (err) {
    console.error('Error creating item:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({message: err.message});
    }
    res.status(500).json({message: 'Server error'});
  }
});

// Update approval status (admin only)
router.patch('/:id/approval', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const {approvalStatus} = req.body;

    if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({message: 'Invalid approval status'});
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({message: 'Item not found'});
    }

    item.approvalStatus = approvalStatus;
    if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
      item.approvalDate = new Date();
      item.approvedBy = req.user._id;
    } else {
      item.approvalDate = null;
      item.approvedBy = null;
    }

    const updatedItem = await item.save();
    await updatedItem.populate('approvedBy', 'firstName lastName');

    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating approval status:', err);
    res.status(500).json({message: 'Server error'});
  }
});

// Get a specific item
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      'approvedBy',
      'firstName lastName',
    );

    if (!item) {
      return res.status(404).json({message: 'Item not found'});
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    if (user.role !== 'admin' && !user.codes.includes(item.code)) {
      return res.status(403).json({message: 'Access denied'});
    }

    res.json(item);
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).json({message: 'Server error'});
  }
});

// Update an item (admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const {title, code, pdfUrl, creationDate} = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({message: 'Item not found'});
    }

    if (code && !validateCode(code)) {
      return res.status(400).json({message: 'Code must be exactly 5 digits'});
    }

    // Update fields if provided
    if (title) item.title = title;
    if (code) item.code = code;
    if (pdfUrl) item.pdfUrl = pdfUrl;
    if (creationDate) item.creationDate = new Date(creationDate);

    const updatedItem = await item.save();
    await updatedItem.populate('approvedBy', 'firstName lastName');

    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating item:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({message: err.message});
    }
    res.status(500).json({message: 'Server error'});
  }
});

// Delete an item (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({message: 'Item not found'});
    }

    await item.deleteOne();
    res.json({message: 'Item deleted successfully'});
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;
