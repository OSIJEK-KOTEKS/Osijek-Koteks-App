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

// Get unique codes
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

// Get all items with pagination and filtering
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

    console.log('Query:', query);

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

    // Calculate total weight for ALL filtered items (not just paginated)
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

    console.log('Found items:', items.length);
    console.log('Total weight of all filtered items:', totalWeight);

    res.json({
      items,
      pagination: {
        total,
        page,
        pages: totalPages,
        hasMore,
      },
      totalWeight,
    });
  } catch (err) {
    console.error('Error in items route:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
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

// Create a new item
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

    // Validate required fields
    if (!title || !code || !pdfUrl) {
      return res.status(400).json({
        message: 'Title, code, and pdfUrl are required',
      });
    }

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
      title: title.trim(),
      code: code.trim(),
      registracija: registracija ? registracija.trim() : undefined,
      pdfUrl: pdfUrl.trim(),
      creationDate: creationDate ? new Date(creationDate) : now,
      creationTime,
      approvalStatus: 'na čekanju',
    });

    // BACKWARD COMPATIBILITY: Handle both neto and tezina fields
    // Priority: explicit tezina > explicit neto > undefined
    if (tezina !== undefined && tezina !== null && tezina !== '') {
      // New web app sends both neto and tezina
      const tezinaValue = parseFloat(tezina);
      const netoValue =
        neto !== undefined && neto !== null && neto !== ''
          ? parseFloat(neto)
          : tezinaValue;

      if (!isNaN(tezinaValue)) {
        item.tezina = tezinaValue;
        item.neto = !isNaN(netoValue) ? netoValue : tezinaValue;
        console.log('Using explicit tezina value:', {
          neto: item.neto,
          tezina: item.tezina,
        });
      }
    } else if (neto !== undefined && neto !== null && neto !== '') {
      // Older versions or when only neto is provided
      const netoValue = parseFloat(neto);
      if (!isNaN(netoValue)) {
        item.neto = netoValue;
        item.tezina = netoValue; // Set tezina to the same value as neto for consistency
        console.log('Using neto as tezina value:', {
          neto: item.neto,
          tezina: item.tezina,
        });
      }
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

// Update an item (admin only)
router.patch('/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const {title, code, neto, tezina, pdfUrl, creationDate} = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({message: 'Item not found'});
    }

    // Update basic fields
    if (title) item.title = title.trim();
    if (code) item.code = code.trim();
    if (pdfUrl) item.pdfUrl = pdfUrl.trim();
    if (creationDate) item.creationDate = new Date(creationDate);

    // Update neto and tezina fields - backward compatible
    if (tezina !== undefined && tezina !== null && tezina !== '') {
      const tezinaValue = parseFloat(tezina);
      if (!isNaN(tezinaValue)) {
        item.tezina = tezinaValue;
        // Also update neto if provided, otherwise keep existing
        if (neto !== undefined && neto !== null && neto !== '') {
          const netoValue = parseFloat(neto);
          if (!isNaN(netoValue)) {
            item.neto = netoValue;
          }
        }
      }
    } else if (neto !== undefined && neto !== null && neto !== '') {
      const netoValue = parseFloat(neto);
      if (!isNaN(netoValue)) {
        item.neto = netoValue;
        item.tezina = netoValue; // Keep tezina in sync with neto
      }
    }

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
const mobileSafetyMiddleware = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobileApp =
    userAgent.includes('okhttp') || userAgent.includes('ReactNative');

  if (isMobileApp && req.path.includes('/approval')) {
    console.log('=== MOBILE SAFETY MIDDLEWARE ===');
    console.log('Cleaning request for mobile app compatibility...');
    console.log('Original body:', JSON.stringify(req.body, null, 2));

    // Clean up the request body to remove any undefined or problematic fields
    const cleanBody = {};

    // Only include fields that mobile app should send
    const allowedFields = [
      'approvalStatus',
      'locationData',
      'inTransit',
      'neto',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        cleanBody[field] = req.body[field];
      }
    }

    // Specifically exclude tezina field for mobile app
    // The mobile app might be trying to send this field as undefined
    if (req.body.hasOwnProperty('tezina')) {
      console.log('Removing tezina field from mobile request');
      delete req.body.tezina;
    }

    // Ensure approvalStatus is a string
    if (
      cleanBody.approvalStatus &&
      typeof cleanBody.approvalStatus !== 'string'
    ) {
      cleanBody.approvalStatus = String(cleanBody.approvalStatus);
    }

    // Ensure inTransit is properly typed
    if (cleanBody.inTransit !== undefined) {
      if (typeof cleanBody.inTransit === 'string') {
        cleanBody.inTransit = cleanBody.inTransit.toLowerCase() === 'true';
      } else {
        cleanBody.inTransit = Boolean(cleanBody.inTransit);
      }
    }

    // Replace the body with cleaned version
    req.body = cleanBody;

    console.log('Cleaned body:', JSON.stringify(req.body, null, 2));
    console.log('================================');
  }

  next();
};

// Add this line right before your approval route:
// router.patch('/:id/approval', mobileSafetyMiddleware, auth, upload.fields([...]), async (req, res) => {

module.exports = {mobileSafetyMiddleware};
// Replace the approval endpoint in your items.js with this mobile-safe version

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
      // Enhanced logging to debug mobile app issues
      const userAgent = req.headers['user-agent'] || '';
      const isMobileApp =
        userAgent.includes('okhttp') || userAgent.includes('ReactNative');

      console.log('=== APPROVAL REQUEST DEBUG ===');
      console.log('Is Mobile App:', isMobileApp);
      console.log('User Agent:', userAgent.substring(0, 100));
      console.log('Item ID:', req.params.id);
      console.log('Request Body:', JSON.stringify(req.body, null, 2));
      console.log('Files:', req.files ? Object.keys(req.files) : 'no files');
      console.log('User Role:', req.user.role);
      console.log('User ID:', req.user._id);
      console.log('===============================');

      const item = await Item.findById(req.params.id);
      if (!item) {
        console.error('Item not found:', req.params.id);
        return res.status(404).json({message: 'Item not found'});
      }

      console.log('Found item:', {
        id: item._id,
        title: item.title.substring(0, 50),
        currentStatus: item.approvalStatus,
        currentTezina: item.tezina,
        currentNeto: item.neto,
      });

      // Extract and validate approval status
      const {approvalStatus, locationData, inTransit, neto} = req.body;

      if (!approvalStatus) {
        console.error('Missing approval status');
        return res.status(400).json({message: 'Approval status is required'});
      }

      if (!['odobreno', 'odbijen'].includes(approvalStatus)) {
        console.error('Invalid approval status:', approvalStatus);
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

      console.log('Updated basic approval fields:', {
        approvalStatus: item.approvalStatus,
        approvalDate: item.approvalDate,
        approvedBy: item.approvedBy,
      });

      // Handle in_transit field with careful type checking
      if (inTransit !== undefined && inTransit !== null) {
        if (typeof inTransit === 'string') {
          item.in_transit = inTransit.toLowerCase() === 'true';
        } else if (typeof inTransit === 'boolean') {
          item.in_transit = inTransit;
        } else {
          item.in_transit = false; // Safe default
        }
        console.log(
          'Set in_transit to:',
          item.in_transit,
          'from:',
          inTransit,
          typeof inTransit,
        );
      }

      // Handle neto field ONLY if it's provided and valid
      // DO NOT touch tezina field for mobile app compatibility
      if (neto !== undefined && neto !== null && neto !== '') {
        const netoValue = parseFloat(neto);
        if (!isNaN(netoValue) && isFinite(netoValue)) {
          item.neto = netoValue;
          console.log('Updated neto to:', item.neto);

          // ONLY set tezina if the item doesn't already have it (preserve original from creation)
          if (item.tezina === undefined || item.tezina === null) {
            item.tezina = netoValue;
            console.log('Set tezina to match neto:', item.tezina);
          } else {
            console.log('Preserved existing tezina:', item.tezina);
          }
        } else {
          console.warn('Invalid neto value provided:', neto);
        }
      }

      // Handle location data with robust error handling
      if (locationData) {
        try {
          let location;
          if (typeof locationData === 'string') {
            location = JSON.parse(locationData);
          } else if (typeof locationData === 'object') {
            location = locationData;
          }

          if (
            location &&
            location.coordinates &&
            typeof location.coordinates.latitude === 'number' &&
            typeof location.coordinates.longitude === 'number' &&
            !isNaN(location.coordinates.latitude) &&
            !isNaN(location.coordinates.longitude)
          ) {
            item.approvalLocation = {
              coordinates: {
                latitude: location.coordinates.latitude,
                longitude: location.coordinates.longitude,
              },
              accuracy:
                typeof location.accuracy === 'number' ? location.accuracy : 0,
              timestamp: location.timestamp
                ? new Date(location.timestamp)
                : new Date(),
            };
            console.log('Set approval location:', item.approvalLocation);
          } else {
            console.warn('Invalid location data structure:', location);
          }
        } catch (error) {
          console.error('Error parsing location data:', error);
          // Continue without location - don't fail the approval
        }
      }

      // Handle file uploads with comprehensive error handling
      if (req.files && Object.keys(req.files).length > 0) {
        console.log('Processing file uploads...');

        try {
          // Handle front photo
          if (req.files.photoFront && req.files.photoFront[0]) {
            console.log('Uploading front photo...');
            const frontFile = req.files.photoFront[0];
            console.log('Front photo details:', {
              mimetype: frontFile.mimetype,
              size: frontFile.size,
              originalname: frontFile.originalname,
            });

            const frontResponse = await uploadToCloudinary(frontFile);
            console.log(
              'Front photo uploaded successfully:',
              frontResponse.publicId,
            );

            // Delete old front photo if exists
            if (item.approvalPhotoFront && item.approvalPhotoFront.publicId) {
              try {
                await cloudinary.uploader.destroy(
                  item.approvalPhotoFront.publicId,
                );
                console.log('Deleted old front photo');
              } catch (deleteError) {
                console.error('Error deleting old front photo:', deleteError);
                // Continue anyway
              }
            }

            item.approvalPhotoFront = {
              url: frontResponse.url,
              uploadDate: new Date(),
              mimeType: frontFile.mimetype,
              publicId: frontResponse.publicId,
            };
          }

          // Handle back photo
          if (req.files.photoBack && req.files.photoBack[0]) {
            console.log('Uploading back photo...');
            const backFile = req.files.photoBack[0];
            console.log('Back photo details:', {
              mimetype: backFile.mimetype,
              size: backFile.size,
              originalname: backFile.originalname,
            });

            const backResponse = await uploadToCloudinary(backFile);
            console.log(
              'Back photo uploaded successfully:',
              backResponse.publicId,
            );

            // Delete old back photo if exists
            if (item.approvalPhotoBack && item.approvalPhotoBack.publicId) {
              try {
                await cloudinary.uploader.destroy(
                  item.approvalPhotoBack.publicId,
                );
                console.log('Deleted old back photo');
              } catch (deleteError) {
                console.error('Error deleting old back photo:', deleteError);
                // Continue anyway
              }
            }

            item.approvalPhotoBack = {
              url: backResponse.url,
              uploadDate: new Date(),
              mimeType: backFile.mimetype,
              publicId: backResponse.publicId,
            };
          }

          // Handle PDF document (for PC users)
          if (req.files.pdfDocument && req.files.pdfDocument[0]) {
            console.log('Uploading PDF document...');
            const pdfFile = req.files.pdfDocument[0];
            console.log('PDF details:', {
              mimetype: pdfFile.mimetype,
              size: pdfFile.size,
              originalname: pdfFile.originalname,
            });

            const pdfResponse = await uploadToCloudinary(pdfFile);
            console.log('PDF uploaded successfully:', pdfResponse.publicId);

            // Delete old document if exists
            if (item.approvalDocument && item.approvalDocument.publicId) {
              try {
                await cloudinary.uploader.destroy(
                  item.approvalDocument.publicId,
                );
                console.log('Deleted old PDF document');
              } catch (deleteError) {
                console.error('Error deleting old PDF:', deleteError);
                // Continue anyway
              }
            }

            item.approvalDocument = {
              url: pdfResponse.url,
              uploadDate: new Date(),
              mimeType: pdfFile.mimetype,
              publicId: pdfResponse.publicId,
            };
          }
        } catch (uploadError) {
          console.error('Critical error during file upload:', uploadError);
          return res.status(500).json({
            message: 'Error uploading files',
            error: uploadError.message,
            errorType: 'upload_error',
          });
        }
      } else {
        console.log('No files to upload');
      }

      // Save the updated item with validation
      try {
        console.log('Saving item with final data:', {
          id: item._id,
          approvalStatus: item.approvalStatus,
          inTransit: item.in_transit,
          neto: item.neto,
          tezina: item.tezina,
          hasLocation: !!item.approvalLocation,
          hasFrontPhoto: !!item.approvalPhotoFront,
          hasBackPhoto: !!item.approvalPhotoBack,
          hasDocument: !!item.approvalDocument,
        });

        const updatedItem = await item.save();
        await updatedItem.populate('approvedBy', 'firstName lastName');

        console.log('=== APPROVAL SUCCESS ===');
        console.log('Item saved successfully:', updatedItem._id);
        console.log('Final status:', updatedItem.approvalStatus);
        console.log('========================');

        // Return the updated item
        res.json(updatedItem);
      } catch (saveError) {
        console.error('Error saving item:', saveError);
        return res.status(500).json({
          message: 'Error saving approval data',
          error: saveError.message,
          errorType: 'save_error',
        });
      }
    } catch (error) {
      console.error('=== APPROVAL ENDPOINT ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Request body:', req.body);
      console.error('Files:', req.files ? Object.keys(req.files) : 'none');
      console.error('===============================');

      res.status(500).json({
        message: 'Server error during approval',
        error: error.message,
        errorType: 'server_error',
        errorId: Math.random().toString(36).substring(7),
      });
    }
  },
);

// Delete an item (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Delete request received for item:', req.params.id);

    if (req.user.role !== 'admin') {
      console.log('Access denied - non-admin user attempted deletion');
      return res.status(403).json({message: 'Access denied. Admin only.'});
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      console.log('Item not found:', req.params.id);
      return res.status(404).json({message: 'Item not found'});
    }

    // Clean up associated files before deleting
    const filesToDelete = [];
    if (item.approvalPhotoFront?.publicId) {
      filesToDelete.push(item.approvalPhotoFront.publicId);
    }
    if (item.approvalPhotoBack?.publicId) {
      filesToDelete.push(item.approvalPhotoBack.publicId);
    }
    if (item.approvalDocument?.publicId) {
      filesToDelete.push(item.approvalDocument.publicId);
    }

    // Delete files from Cloudinary
    for (const publicId of filesToDelete) {
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log('Deleted file from Cloudinary:', publicId);
      } catch (error) {
        console.error('Error deleting file from Cloudinary:', publicId, error);
      }
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
