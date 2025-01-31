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

router.get('/codes', auth, async (req, res) => {
  try {
    // If user is not admin and doesn't have full access, filter by their codes
    let query = {};
    if (req.user.role !== 'admin' && !req.user.hasFullAccess) {
      query.code = {$in: req.user.codes};
    }

    const uniqueCodes = await Item.distinct('code', query);
    res.json(uniqueCodes.sort());
  } catch (err) {
    console.error('Error fetching unique codes:', err);
    res.status(500).json({message: 'Server error'});
  }
});
// Get items by user's codes
// In items.js route
router.get('/', auth, async (req, res) => {
  try {
    const {startDate, endDate, code, sortOrder, searchTitle} = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build the base query
    let query = {};

    // If search mode is active (searchTitle is provided)
    if (searchTitle) {
      // Use case-insensitive regex search for title
      query.title = {$regex: searchTitle, $options: 'i'};
    } else {
      // Apply regular filters only if not in search mode
      // If user is not admin and doesn't have full access, filter by their codes
      if (req.user.role !== 'admin' && !req.user.hasFullAccess) {
        query.code = {$in: req.user.codes};
      }

      // Add date filter if dates are provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        query.creationDate = {
          $gte: start,
          $lte: end,
        };
      }

      // Add code filter if specific code is requested
      if (code && code !== 'all') {
        query.code = code;
      }
    }

    let sortOptions = {creationDate: -1}; // Default sort
    if (sortOrder === 'date-asc') {
      sortOptions = {creationDate: 1};
    } else if (sortOrder === 'approved-first') {
      sortOptions = {
        approvalStatus: -1,
        creationDate: -1,
      };
    } else if (sortOrder === 'pending-first') {
      sortOptions = {
        approvalStatus: 1,
        creationDate: -1,
      };
    }

    const items = await Item.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('approvedBy', 'firstName lastName');

    const total = await Item.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    res.json({
      items,
      pagination: {
        total,
        page,
        pages: totalPages,
        hasMore,
      },
    });
  } catch (err) {
    console.error('Error in items route:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
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

    const {title, code, registracija, pdfUrl, creationDate} = req.body;

    const now = new Date();
    const creationTime = now.toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });

    const item = new Item({
      title,
      code,
      registracija, // Add this field
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
router.patch(
  '/:id/approval',
  auth,
  upload.fields([
    {name: 'photoFront', maxCount: 1},
    {name: 'photoBack', maxCount: 1},
  ]),
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
        const files = req.files;

        if (!files?.photoFront?.[0] || !files?.photoBack?.[0]) {
          console.log('Missing required photos');
          return res.status(400).json({
            message: 'Both front and back photos are required for approval',
          });
        }

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
          console.log('Uploading front photo to Cloudinary...');
          const frontPhotoResponse = await uploadToCloudinary(
            files.photoFront[0],
          );
          console.log('Front photo uploaded:', frontPhotoResponse);

          console.log('Uploading back photo to Cloudinary...');
          const backPhotoResponse = await uploadToCloudinary(
            files.photoBack[0],
          );
          console.log('Back photo uploaded:', backPhotoResponse);

          // Delete old photos if they exist
          if (item.approvalPhotoFront?.publicId) {
            await cloudinary.uploader.destroy(item.approvalPhotoFront.publicId);
          }
          if (item.approvalPhotoBack?.publicId) {
            await cloudinary.uploader.destroy(item.approvalPhotoBack.publicId);
          }

          // Set front photo data
          item.approvalPhotoFront = {
            url: frontPhotoResponse.url,
            uploadDate: new Date(),
            mimeType: files.photoFront[0].mimetype,
            publicId: frontPhotoResponse.publicId,
          };

          // Set back photo data
          item.approvalPhotoBack = {
            url: backPhotoResponse.url,
            uploadDate: new Date(),
            mimeType: files.photoBack[0].mimetype,
            publicId: backPhotoResponse.publicId,
          };

          item.approvalLocation = {
            coordinates: {
              latitude: parsedLocationData.coordinates.latitude,
              longitude: parsedLocationData.coordinates.longitude,
            },
            accuracy: parsedLocationData.accuracy,
            timestamp: new Date(parsedLocationData.timestamp),
          };

          console.log('Updated item with Cloudinary photos');
        } catch (error) {
          console.error('Detailed upload error:', error);
          return res.status(500).json({
            message: 'Error uploading images',
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

        // If there are existing photos, delete them from Cloudinary
        if (item.approvalPhotoFront?.publicId) {
          await cloudinary.uploader.destroy(item.approvalPhotoFront.publicId);
        }
        if (item.approvalPhotoBack?.publicId) {
          await cloudinary.uploader.destroy(item.approvalPhotoBack.publicId);
        }

        // Reset front photo data
        item.approvalPhotoFront = {
          url: null,
          uploadDate: null,
          mimeType: null,
          publicId: null,
        };

        // Reset back photo data
        item.approvalPhotoBack = {
          url: null,
          uploadDate: null,
          mimeType: null,
          publicId: null,
        };

        // Reset location data
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
      return res.status(400).json({message: 'Code is not in valid form'});
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
