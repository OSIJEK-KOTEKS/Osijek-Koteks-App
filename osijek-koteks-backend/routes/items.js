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

// Updated file filter to accept both images and PDF
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pdfDocument') {
    // Check mime type for PDFs
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    return cb(
      new Error('Samo PDF datoteke su dozvoljene za pdfDocument!'),
      false,
    );
  } else {
    // For photos (photoFront and photoBack fields)
    if (!file.originalname.match(/\.(jpg|jpeg|png|heic)$/)) {
      return cb(new Error('Samo slike su dozvoljene za fotografije!'), false);
    }
    cb(null, true);
  }
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

router.get('/', auth, async (req, res) => {
  try {
    const {startDate, endDate, code, sortOrder, searchTitle, inTransitOnly} =
      req.query;
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

      // Add in_transit filter if requested
      if (inTransitOnly === 'true') {
        query.in_transit = true;
      }
    }

    console.log('Query:', query); // Add this for debugging

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

    console.log('Found items:', items.length); // Add this for debugging

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

    const {title, code, registracija, neto, pdfUrl, creationDate} = req.body;

    // Check if an item with the same title already exists
    const existingItem = await Item.findOne({title: title.trim()});

    if (existingItem) {
      console.log('Found existing item with same title:', existingItem._id);

      // Delete the existing item (including any associated files)
      if (existingItem.approvalPhotoFront?.publicId) {
        try {
          await cloudinary.uploader.destroy(
            existingItem.approvalPhotoFront.publicId,
          );
          console.log('Deleted old front photo from Cloudinary');
        } catch (error) {
          console.error('Error deleting old front photo:', error);
        }
      }

      if (existingItem.approvalPhotoBack?.publicId) {
        try {
          await cloudinary.uploader.destroy(
            existingItem.approvalPhotoBack.publicId,
          );
          console.log('Deleted old back photo from Cloudinary');
        } catch (error) {
          console.error('Error deleting old back photo:', error);
        }
      }

      if (existingItem.approvalDocument?.publicId) {
        try {
          await cloudinary.uploader.destroy(
            existingItem.approvalDocument.publicId,
          );
          console.log('Deleted old document from Cloudinary');
        } catch (error) {
          console.error('Error deleting old document:', error);
        }
      }

      // Delete the item from database
      await Item.findByIdAndDelete(existingItem._id);
      console.log('Deleted existing item from database:', existingItem._id);
    }

    const now = new Date();
    const creationTime = now.toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });

    // Create the new item object
    const item = new Item({
      title: title.trim(), // Trim whitespace for consistency
      code,
      registracija,
      pdfUrl,
      creationDate: creationDate ? new Date(creationDate) : now,
      creationTime,
      approvalStatus: 'na čekanju',
    });

    // Add neto field if it exists
    if (neto !== undefined) {
      item.neto = neto;
    }

    const newItem = await item.save();
    console.log('Created new item:', newItem._id);

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
    {name: 'pdfDocument', maxCount: 1}, // New field for pc-user PDF upload
  ]),
  async (req, res) => {
    try {
      const {approvalStatus, locationData, inTransit} = req.body;
      console.log('Starting approval update with status:', approvalStatus);
      console.log('In Transit value:', inTransit);
      console.log('User role:', req.user.role);

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

        // Handle different approval methods based on user role
        if (req.user.role === 'pc-user') {
          // PC-users upload PDFs
          if (!files?.pdfDocument?.[0]) {
            console.log('Missing required PDF document');
            return res.status(400).json({
              message: 'PDF document is required for approval by PC-user',
            });
          }

          try {
            console.log('Uploading PDF document to Cloudinary...');
            const pdfResponse = await uploadToCloudinary(files.pdfDocument[0]);
            console.log('PDF document uploaded:', pdfResponse);

            // Delete old PDF if it exists
            if (item.approvalDocument?.publicId) {
              await cloudinary.uploader.destroy(item.approvalDocument.publicId);
            }

            // Set document data
            item.approvalDocument = {
              url: pdfResponse.url,
              uploadDate: new Date(),
              mimeType: files.pdfDocument[0].mimetype,
              publicId: pdfResponse.publicId,
            };

            // Set default location for PC-user (office coordinates)
            item.approvalLocation = {
              coordinates: {
                latitude: 45.56204169974961,
                longitude: 18.678308891755552,
              },
              accuracy: 10,
              timestamp: new Date(),
            };

            // Set in_transit field based on checkbox
            item.in_transit = inTransit === 'true';

            console.log(
              'Updated item with PDF document and in_transit status:',
              item.in_transit,
            );
          } catch (error) {
            console.error('Detailed PDF upload error:', error);
            return res.status(500).json({
              message: 'Error uploading PDF document',
              error: error.message,
              stack: error.stack,
            });
          }
        } else {
          // Regular users upload photos
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
              await cloudinary.uploader.destroy(
                item.approvalPhotoFront.publicId,
              );
            }
            if (item.approvalPhotoBack?.publicId) {
              await cloudinary.uploader.destroy(
                item.approvalPhotoBack.publicId,
              );
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

            // Set in_transit field based on checkbox
            item.in_transit = inTransit === 'true';

            console.log(
              'Updated item with Cloudinary photos and in_transit status:',
              item.in_transit,
            );
          } catch (error) {
            console.error('Detailed upload error:', error);
            return res.status(500).json({
              message: 'Error uploading images',
              error: error.message,
              stack: error.stack,
            });
          }
        }
      }

      item.approvalStatus = approvalStatus;
      if (approvalStatus === 'odobreno') {
        item.approvalDate = new Date();
        item.approvedBy = req.user._id;
      } else {
        item.approvalDate = null;
        item.approvedBy = null;
        item.in_transit = false; // Reset in_transit flag if not approved

        // Delete and reset all approval assets
        // If there are existing photos, delete them from Cloudinary
        if (item.approvalPhotoFront?.publicId) {
          await cloudinary.uploader.destroy(item.approvalPhotoFront.publicId);
        }
        if (item.approvalPhotoBack?.publicId) {
          await cloudinary.uploader.destroy(item.approvalPhotoBack.publicId);
        }
        if (item.approvalDocument?.publicId) {
          await cloudinary.uploader.destroy(item.approvalDocument.publicId);
        }

        // Reset photo data
        item.approvalPhotoFront = {
          url: null,
          uploadDate: null,
          mimeType: null,
          publicId: null,
        };
        item.approvalPhotoBack = {
          url: null,
          uploadDate: null,
          mimeType: null,
          publicId: null,
        };

        // Reset document data
        item.approvalDocument = {
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
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'bot') {
      return res
        .status(403)
        .json({message: 'Access denied. Admin or Bot users only.'});
    }

    const {title, code, registracija, neto, pdfUrl, creationDate} = req.body;

    const now = new Date();
    const creationTime = now.toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });

    // Create the item object with optional neto field
    const item = new Item({
      title,
      code,
      registracija,
      pdfUrl,
      creationDate: creationDate ? new Date(creationDate) : now,
      creationTime,
      approvalStatus: 'na čekanju',
    });

    // Add neto field if it exists
    if (neto !== undefined) {
      item.neto = neto;
    }

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

// Update an item (admin only)
router.patch('/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const {title, code, neto, pdfUrl, creationDate} = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({message: 'Item not found'});
    }

    if (code && typeof validateCode === 'function' && !validateCode(code)) {
      return res.status(400).json({message: 'Code is not in valid form'});
    }

    // Update basic fields
    if (title) item.title = title;
    if (code) item.code = code;
    if (pdfUrl) item.pdfUrl = pdfUrl;
    if (creationDate) item.creationDate = new Date(creationDate);

    // Update neto field - note we check if it's in the request body because 0 is a valid value
    if (neto !== undefined) {
      item.neto = neto;
    }

    // Handle photo upload if present (existing code)
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
