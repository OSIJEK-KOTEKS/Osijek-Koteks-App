const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Item = require('../models/Item');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads/approval-photos';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {recursive: true});
}

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

// Image compression and processing function
const processAndSaveImage = async (buffer, originalname) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = 'approval-' + uniqueSuffix + path.extname(originalname);
  const filepath = path.join(uploadDir, filename);

  try {
    await sharp(buffer, {failOnError: false})
      .rotate() // This will auto-rotate based on EXIF data
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toFile(filepath);

    return '/' + filepath;
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
};
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

    const item = new Item({
      title,
      code,
      pdfUrl,
      creationDate: creationDate ? new Date(creationDate) : new Date(),
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
  upload.single('photo'),
  async (req, res) => {
    try {
      const {approvalStatus, locationData} = req.body;

      if (
        !approvalStatus ||
        !['na čekanju', 'odobreno', 'odbijen'].includes(approvalStatus)
      ) {
        return res.status(400).json({message: 'Invalid approval status'});
      }

      const item = await Item.findById(req.params.id);
      if (!item) {
        return res.status(404).json({message: 'Item not found'});
      }

      if (approvalStatus === 'odobreno') {
        if (!req.file) {
          return res
            .status(400)
            .json({message: 'Photo is required for approval'});
        }

        let parsedLocationData;
        try {
          parsedLocationData = JSON.parse(locationData);
        } catch (error) {
          return res.status(400).json({
            message: 'Invalid location data format',
            error: error.message,
          });
        }

        try {
          const photoUrl = await processAndSaveImage(
            req.file.buffer,
            req.file.originalname,
          );

          item.approvalPhoto = {
            url: photoUrl,
            uploadDate: new Date(),
            mimeType: 'image/jpeg',
          };

          item.approvalLocation = {
            coordinates: {
              latitude: parsedLocationData.coordinates.latitude,
              longitude: parsedLocationData.coordinates.longitude,
            },
            accuracy: parsedLocationData.accuracy,
            timestamp: new Date(parsedLocationData.timestamp),
          };
        } catch (error) {
          console.error('Error processing image:', error);
          return res.status(500).json({
            message: 'Error processing image',
            error: error.message,
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

      const updatedItem = await item.save();
      await updatedItem.populate('approvedBy', 'firstName lastName');

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
