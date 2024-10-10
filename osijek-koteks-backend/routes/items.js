const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Create a new item
router.post('/', async (req, res) => {
  const item = new Item({
    title: req.body.title,
    code: req.body.code,
    pdfUrl: req.body.pdfUrl,
  });

  try {
    const newItem = await item.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({message: err.message});
  }
});

// Get a specific item
router.get('/:id', getItem, (req, res) => {
  res.json(res.item);
});

// Update an item
router.patch('/:id', getItem, async (req, res) => {
  if (req.body.title != null) {
    res.item.title = req.body.title;
  }
  if (req.body.code != null) {
    res.item.code = req.body.code;
  }
  if (req.body.pdfUrl != null) {
    res.item.pdfUrl = req.body.pdfUrl;
  }
  res.item.updatedAt = Date.now();

  try {
    const updatedItem = await res.item.save();
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({message: err.message});
  }
});

// Delete an item
router.delete('/:id', getItem, async (req, res) => {
  try {
    await res.item.remove();
    res.json({message: 'Item deleted'});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Middleware function to get an item by ID
async function getItem(req, res, next) {
  let item;
  try {
    item = await Item.findById(req.params.id);
    if (item == null) {
      return res.status(404).json({message: 'Cannot find item'});
    }
  } catch (err) {
    return res.status(500).json({message: err.message});
  }

  res.item = item;
  next();
}

module.exports = router;
