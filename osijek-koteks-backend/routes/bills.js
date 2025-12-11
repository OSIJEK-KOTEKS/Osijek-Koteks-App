const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

const ensureRacuniAccess = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.canAccessRacuni) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Racuni access required.' });
};

const DOBAVLJACI = ['KAMEN - PSUNJ d.o.o.', 'MOLARIS d.o.o.', 'VELIČKI KAMEN d.o.o.'];

const baseBillQuery = () =>
  Bill.find().populate({
    path: 'items',
    select:
      'title code pdfUrl creationDate registracija prijevoznik approvalStatus in_transit isPaid neto tezina approvalLocation approvalDocument approvalPhotoFront approvalPhotoBack',
  });

// Get bills for current user (admins see all)
router.get('/', auth, ensureRacuniAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const bills = await baseBillQuery().find(filter).populate('createdBy', 'firstName lastName email');
    res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create bill
router.post('/', auth, ensureRacuniAccess, async (req, res) => {
  try {
    const { title, description, itemIds, dobavljac } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!dobavljac || !DOBAVLJACI.includes(dobavljac)) {
      return res.status(400).json({ message: 'Valid dobavljac is required' });
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: 'At least one item must be attached' });
    }

    const uniqueItemIds = [...new Set(itemIds)].filter(Boolean);
    const items = await Item.find({ _id: { $in: uniqueItemIds } });

    if (items.length !== uniqueItemIds.length) {
      return res.status(404).json({ message: 'One or more items were not found' });
    }

    if (req.user.role !== 'admin') {
      const unauthorized = items.find(item => item.createdBy.toString() !== req.user._id.toString());
      if (unauthorized) {
        return res.status(403).json({ message: 'You can only attach your own items' });
      }
    }

    const bill = new Bill({
      title: title.trim(),
      dobavljac,
      description: description ? description.trim() : '',
      items: uniqueItemIds,
      createdBy: req.user._id,
    });

    await bill.save();
    const populated = await baseBillQuery().findById(bill._id).populate('createdBy', 'firstName lastName email');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single bill (for completeness)
router.get('/:id', auth, ensureRacuniAccess, async (req, res) => {
  try {
    const bill = await baseBillQuery().findById(req.params.id).populate('createdBy', 'firstName lastName email');
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (req.user.role !== 'admin' && bill.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(bill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
