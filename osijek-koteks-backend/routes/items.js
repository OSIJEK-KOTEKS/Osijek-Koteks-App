const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Item = require('../models/Item');
const User = require('../models/User');
const auth = require('../middleware/auth');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');
// Configure multer for file upload
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|heic)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

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

    const query = user.role === 'admin' ? {} : {code: {$in: user.codes}};

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

// Create a new item
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'bot') {
      return res
        .status(403)
        .json({message: 'Access denied. Admin or Bot users only.'});
    }

    const {title, code, pdfUrl, creationDate} = req.body;

    if (!validateCode(code)) {
      return res.status(400).json({message: 'Code must be exactly 5 digits'});
    }

    const now = new Date();
    const creationTime = now.toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });

    const item = new Item({
      title,
      code,
      pdfUrl,
      creationDate: creationDate ? new Date(creationDate) : now,
      creationTime,
      approvalStatus: 'na čekanju',
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

// Update approval status
// Update approval status
router.patch(
  '/:id/approval',
  auth,
  upload.single('photo'),
  async (req, res) => {
    try {
      const {approvalStatus, locationData} = req.body;
      console.log('Starting approval update with status:', approvalStatus);

      if (
        !approvalStatus ||
        !['na čekanju', 'odobreno', 'odbijen'].includes(approvalStatus)
      ) {
        console.log('Invalid approval status:', approvalStatus);
        return res.status(400).json({message: 'Invalid approval status'});
      }

      const item = await Item.findById(req.params.id);
      if (!item) {
        console.log('Item not found:', req.params.id);
        return res.status(404).json({message: 'Item not found'});
      }

      if (approvalStatus === 'odobreno') {
        if (!req.file) {
          console.log('No file in request');
          return res
            .status(400)
            .json({message: 'Photo is required for approval'});
        }
        console.log('File received:', {
          mimetype: req.file.mimetype,
          size: req.file.size,
        });

        let parsedLocationData;
        try {
          parsedLocationData = JSON.parse(locationData);
          console.log('Location data parsed:', parsedLocationData);
        } catch (error) {
          console.error('Location data parsing error:', error);
          return res.status(400).json({
            message: 'Invalid location data format',
            error: error.message,
          });
        }

        try {
          console.log('About to upload to Cloudinary...');
          const cloudinaryResponse = await uploadToCloudinary(req.file);
          console.log('Cloudinary response:', cloudinaryResponse);

          item.approvalPhoto = {
            url: cloudinaryResponse.url,
            uploadDate: new Date(),
            mimeType: req.file.mimetype,
            publicId: cloudinaryResponse.publicId,
          };

          item.approvalLocation = {
            coordinates: {
              latitude: parsedLocationData.coordinates.latitude,
              longitude: parsedLocationData.coordinates.longitude,
            },
            accuracy: parsedLocationData.accuracy,
            timestamp: new Date(parsedLocationData.timestamp),
          };

          console.log(
            'Updated item with Cloudinary photo:',
            item.approvalPhoto,
          );
        } catch (error) {
          console.error('Detailed upload error:', error);
          return res.status(500).json({
            message: 'Error uploading image',
            error: error.message,
            stack: error.stack,
          });
        }
      }

      item.approvalStatus = approvalStatus;
      if (approvalStatus === 'odobreno') {
        item.approvalDate = new Date();
        item.approvedBy = req.user._id;
      } else {
        item.approvalDate = null;
        item.approvedBy = null;
        item.approvalPhoto = {
          url: null,
          uploadDate: null,
          mimeType: null,
          publicId: null,
        };
        item.approvalLocation = {
          coordinates: {
            latitude: null,
            longitude: null,
          },
          accuracy: null,
          timestamp: null,
        };
      }

      console.log('Saving updated item...');
      const updatedItem = await item.save();
      await updatedItem.populate('approvedBy', 'firstName lastName');
      console.log('Item successfully updated');

      res.json(updatedItem);
    } catch (err) {
      console.error('Error updating approval status:', err);
      if (err.name === 'MulterError') {
        return res.status(400).json({
          message: 'File upload error',
          error: err.message,
        });
      }
      res.status(500).json({message: 'Server error', error: err.message});
    }
  },
);

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
router.patch('/:id', auth, upload.single('photo'), async (req, res) => {
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

    // Update basic fields
    if (title) item.title = title;
    if (code) item.code = code;
    if (pdfUrl) item.pdfUrl = pdfUrl;
    if (creationDate) item.creationDate = new Date(creationDate);

    // Handle photo upload if present
    if (req.file) {
      try {
        console.log('Uploading new photo to Cloudinary...');
        const cloudinaryResponse = await uploadToCloudinary(req.file);
        console.log('Cloudinary response:', cloudinaryResponse);

        // Delete old photo from Cloudinary if exists
        if (item.approvalPhoto && item.approvalPhoto.publicId) {
          await cloudinary.uploader.destroy(item.approvalPhoto.publicId);
        }

        item.approvalPhoto = {
          url: cloudinaryResponse.url,
          uploadDate: new Date(),
          mimeType: req.file.mimetype,
          publicId: cloudinaryResponse.publicId,
        };
      } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({
          message: 'Error uploading image',
          error: error.message,
        });
      }
    }

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
    console.log('Delete request received for item:', req.params.id);
    console.log('Request user:', req.user);

    if (req.user.role !== 'admin') {
      console.log('Access denied - non-admin user attempted deletion');
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      console.log('Item not found:', req.params.id);
      return res.status(404).json({message: 'Item not found'});
    }

    await item.deleteOne();
    console.log('Item successfully deleted:', req.params.id);
    res.json({message: 'Item deleted successfully'});
  } catch (err) {
    console.error('Error during item deletion:', err);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;
