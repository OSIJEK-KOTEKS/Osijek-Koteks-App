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
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    // If user is admin, they can see all items
    const query = user.role === 'admin' ? {} : {code: {$in: user.codes}};

    const items = await Item.find(query);
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({message: 'Server error'});
  }
});

// Create a new item (admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const {title, code, pdfUrl} = req.body;

    // Validate code format
    if (!validateCode(code)) {
      return res.status(400).json({message: 'Code must be exactly 5 digits'});
    }

    // Check if item with this code already exists
    const existingItem = await Item.findOne({code});
    if (existingItem) {
      return res
        .status(400)
        .json({message: 'Item with this code already exists'});
    }

    const item = new Item({
      title,
      code,
      pdfUrl,
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

// Get a specific item
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({message: 'Item not found'});
    }

    // Check if user has access to this item
    const user = await User.findById(req.user.id);
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
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const {title, code, pdfUrl} = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({message: 'Item not found'});
    }

    // If code is being updated, validate new code
    if (code) {
      if (!validateCode(code)) {
        return res.status(400).json({message: 'Code must be exactly 5 digits'});
      }

      // Check if new code already exists on another item
      const existingItem = await Item.findOne({
        code,
        _id: {$ne: req.params.id},
      });
      if (existingItem) {
        return res
          .status(400)
          .json({message: 'Item with this code already exists'});
      }
    }

    // Update fields if provided
    if (title) item.title = title;
    if (code) item.code = code;
    if (pdfUrl) item.pdfUrl = pdfUrl;

    const updatedItem = await item.save();
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
    // Check if user is admin
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
