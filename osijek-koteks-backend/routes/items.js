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

// Add this to your items.js route file - update the GET '/' route

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

    // Get paginated items
    const items = await Item.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('approvedBy', 'firstName lastName');

    // Get total count
    const total = await Item.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    // NEW: Calculate total weight for ALL filtered items (not just paginated)
    const totalWeightResult = await Item.aggregate([
      {$match: query},
      {
        $group: {
          _id: null,
          totalWeight: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    {$ne: ['$tezina', null]},
                    {$ne: ['$tezina', undefined]},
                  ],
                },
                then: '$tezina',
                else: 0,
              },
            },
          },
        },
      },
    ]);

    const totalWeight =
      totalWeightResult.length > 0 ? totalWeightResult[0].totalWeight : 0;

    console.log('Found items:', items.length); // Add this for debugging
    console.log('Total weight of all filtered items:', totalWeight); // Add this for debugging

    res.json({
      items,
      pagination: {
        total,
        page,
        pages: totalPages,
        hasMore,
      },
      totalWeight, // NEW: Add total weight to response
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
// Update the POST route in items.js for creating new items

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'bot') {
      return res
        .status(403)
        .json({message: 'Access denied. Admin or Bot users only.'});
    }

    const {title, code, registracija, neto, tezina, pdfUrl, creationDate} =
      req.body;

    console.log('Creating item with data:', {
      title: title?.substring(0, 50) + '...',
      code,
      registracija,
      neto,
      tezina,
      hasTitle: !!title,
    });

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

    // BACKWARD COMPATIBILITY: Handle both neto and tezina fields
    // Priority: explicit tezina > explicit neto > undefined
    if (tezina !== undefined && tezina !== null) {
      // New web app sends both neto and tezina
      item.neto = neto !== undefined ? neto : tezina;
      item.tezina = tezina;
      console.log('Using explicit tezina value:', {
        neto: item.neto,
        tezina: item.tezina,
      });
    } else if (neto !== undefined && neto !== null) {
      // Older versions or when only neto is provided
      item.neto = neto;
      item.tezina = neto; // Set tezina to the same value as neto for consistency
      console.log('Using neto as tezina value:', {
        neto: item.neto,
        tezina: item.tezina,
      });
    }
    // If neither is provided, both remain undefined (which is fine)

    const newItem = await item.save();
    console.log('Created new item:', {
      id: newItem._id,
      title: newItem.title.substring(0, 50) + '...',
      neto: newItem.neto,
      tezina: newItem.tezina,
    });

    res.status(201).json(newItem);
  } catch (err) {
    console.error('Error creating item:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({message: err.message});
    }
    res.status(500).json({message: 'Server error'});
  }
});

// Add this route handler for item approval (PATCH /:id/approval)
router.patch(
  '/:id/approval',
  auth,
  upload.fields([
    {name: 'photoFront', maxCount: 1},
    {name: 'photoBack', maxCount: 1},
    {name: 'pdfDocument', maxCount: 1},
  ]),
  async (req, res) => {
    try {
      console.log('Approval request received:', {
        itemId: req.params.id,
        files: req.files ? Object.keys(req.files) : 'no files',
        body: req.body,
        userRole: req.user.role,
      });

      const item = await Item.findById(req.params.id);
      if (!item) {
        return res.status(404).json({message: 'Item not found'});
      }

      const {approvalStatus, locationData, inTransit, neto} = req.body;

      // Validate approval status
      if (!['odobreno', 'odbijen'].includes(approvalStatus)) {
        return res.status(400).json({message: 'Invalid approval status'});
      }

      // Update basic approval fields
      item.approvalStatus = approvalStatus;
      item.approvalDate = new Date().toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      item.approvedBy = req.user._id;

      // Handle in_transit field (convert string to boolean for backward compatibility)
      if (inTransit !== undefined) {
        item.in_transit = inTransit === 'true' || inTransit === true;
      }

      // Handle neto field (for PC users or updated mobile apps)
      if (neto !== undefined && neto !== null && neto !== '') {
        const netoValue = parseFloat(neto);
        if (!isNaN(netoValue)) {
          item.neto = netoValue;
          // BACKWARD COMPATIBILITY: Only set tezina if item doesn't already have it
          // This prevents overwriting the original tezina from item creation
          if (item.tezina === undefined || item.tezina === null) {
            item.tezina = netoValue;
          }
        }
      }

      // Handle location data
      if (locationData) {
        try {
          const location =
            typeof locationData === 'string'
              ? JSON.parse(locationData)
              : locationData;

          item.approvalLocation = {
            coordinates: {
              latitude: location.coordinates.latitude,
              longitude: location.coordinates.longitude,
            },
            accuracy: location.accuracy,
            timestamp: location.timestamp
              ? new Date(location.timestamp)
              : new Date(),
          };
        } catch (error) {
          console.error('Error parsing location data:', error);
          // Don't fail the entire request if location parsing fails
        }
      }

      // Handle photo uploads (mobile app sends photoFront and photoBack)
      if (req.files) {
        try {
          // Handle front photo
          if (req.files.photoFront && req.files.photoFront[0]) {
            console.log('Uploading front photo to Cloudinary...');
            const frontResponse = await uploadToCloudinary(
              req.files.photoFront[0],
            );

            // Delete old front photo if exists
            if (item.approvalPhotoFront && item.approvalPhotoFront.publicId) {
              try {
                await cloudinary.uploader.destroy(
                  item.approvalPhotoFront.publicId,
                );
              } catch (error) {
                console.error('Error deleting old front photo:', error);
              }
            }

            item.approvalPhotoFront = {
              url: frontResponse.url,
              uploadDate: new Date(),
              mimeType: req.files.photoFront[0].mimetype,
              publicId: frontResponse.publicId,
            };
          }

          // Handle back photo
          if (req.files.photoBack && req.files.photoBack[0]) {
            console.log('Uploading back photo to Cloudinary...');
            const backResponse = await uploadToCloudinary(
              req.files.photoBack[0],
            );

            // Delete old back photo if exists
            if (item.approvalPhotoBack && item.approvalPhotoBack.publicId) {
              try {
                await cloudinary.uploader.destroy(
                  item.approvalPhotoBack.publicId,
                );
              } catch (error) {
                console.error('Error deleting old back photo:', error);
              }
            }

            item.approvalPhotoBack = {
              url: backResponse.url,
              uploadDate: new Date(),
              mimeType: req.files.photoBack[0].mimetype,
              publicId: backResponse.publicId,
            };
          }

          // Handle PDF document (for PC users)
          if (req.files.pdfDocument && req.files.pdfDocument[0]) {
            console.log('Uploading PDF document to Cloudinary...');
            const pdfResponse = await uploadToCloudinary(
              req.files.pdfDocument[0],
            );

            // Delete old document if exists
            if (item.approvalDocument && item.approvalDocument.publicId) {
              try {
                await cloudinary.uploader.destroy(
                  item.approvalDocument.publicId,
                );
              } catch (error) {
                console.error('Error deleting old document:', error);
              }
            }

            item.approvalDocument = {
              url: pdfResponse.url,
              uploadDate: new Date(),
              mimeType: req.files.pdfDocument[0].mimetype,
              publicId: pdfResponse.publicId,
            };
          }
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          return res.status(500).json({
            message: 'Error uploading files',
            error: uploadError.message,
          });
        }
      }

      // Save the updated item
      const updatedItem = await item.save();
      await updatedItem.populate('approvedBy', 'firstName lastName');

      console.log('Item approval successful:', {
        itemId: updatedItem._id,
        approvalStatus: updatedItem.approvalStatus,
        inTransit: updatedItem.in_transit,
        hasPhotos: !!(
          updatedItem.approvalPhotoFront && updatedItem.approvalPhotoBack
        ),
        hasDocument: !!updatedItem.approvalDocument,
        hasLocation: !!updatedItem.approvalLocation,
        neto: updatedItem.neto,
        tezina: updatedItem.tezina,
      });

      res.json(updatedItem);
    } catch (error) {
      console.error('Error in approval endpoint:', error);
      res.status(500).json({
        message: 'Server error during approval',
        error: error.message,
      });
    }
  },
);
// Update an item (admin only) - Updated to handle tezina field
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

    // Update neto and tezina fields - note we check if it's in the request body because 0 is a valid value
    if (neto !== undefined) {
      item.neto = neto;
      item.tezina = neto; // NEW: Set tezina to the same value as neto
      console.log('Updating neto and tezina values:', {neto, tezina: neto});
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
