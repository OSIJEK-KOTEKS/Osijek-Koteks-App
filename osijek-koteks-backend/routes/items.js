const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Item = require('../models/Item');
const User = require('../models/User');
const TransportAcceptance = require('../models/TransportAcceptance');
const auth = require('../middleware/auth');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');
// Function to extract RN code from filename with special pattern handling
const extractRNFromFilename = (filename, defaultCode) => {
  if (!filename || typeof filename !== 'string') {
    return defaultCode;
  }

  // Check if filename contains a pattern between '#' signs
  // Pattern: #[anything]# where anything can include numbers, letters, spaces, and signs
  const hashPattern = /#([^#]+)#/;  // Capturing group to extract content
  const match = filename.match(hashPattern);
  
  if (match && match[1]) {
    // Found a pattern between '#' signs, extract the content
    const extractedCode = match[1].trim();
    console.log('Extracted RN code from filename pattern:', {
      filename: filename.substring(0, 100) + '...',
      pattern: match[0],
      extractedCode: extractedCode
    });
    return extractedCode;
  }
  
  // No special pattern found, return the default code
  return defaultCode;
};

// Helper function to extract first part of registration (same logic as transportRequests)
const getFirstPartOfRegistration = (registration) => {
  if (!registration) return '';

  // Pattern 1: With spaces - "PŽ 995 FD", "SB 004 NP", "NA 224 O"
  const withSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\s+\d+\s+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
  if (withSpaces) return withSpaces[1];

  // Pattern 2: Without spaces - "NG341CP", "AB123CD"
  const withoutSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\d+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
  if (withoutSpaces) return withoutSpaces[1];

  // Fallback: return original if no pattern matches
  return registration;
};

const normalizeCarrierName = name => {
  if (!name) return '';
  return (
    name
      .trim()
      .toUpperCase()
      // Normalize Croatian characters
      .replace(/Č/g, 'C')
      .replace(/Ć/g, 'C')
      .replace(/Š/g, 'S')
      .replace(/Ž/g, 'Z')
      .replace(/Đ/g, 'D')
      .replace(/DŽ/g, 'DZ')
      // Remove common company suffixes for comparison
      .replace(/\s+(D\.O\.O\.|DOO|D\.O\.O|OBRT)\.?$/i, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim()
  );
};

// Function to find all carrier variations that match the normalized form
const findCarrierVariations = async selectedCarrier => {
  try {
    console.log('Finding variations for carrier:', selectedCarrier);

    // Get all unique carriers from database
    const allCarriers = await Item.distinct('prijevoznik');

    // Normalize the selected carrier
    const normalizedSelected = normalizeCarrierName(selectedCarrier);
    console.log('Normalized selected carrier:', normalizedSelected);

    // Find all carriers that normalize to the same value
    const variations = allCarriers.filter(carrier => {
      if (!carrier) return false;
      const normalized = normalizeCarrierName(carrier);
      const matches = normalized === normalizedSelected;
      if (matches) {
        console.log(`Found variation: "${carrier}" -> "${normalized}"`);
      }
      return matches;
    });

    console.log('All variations found:', variations);
    return variations;
  } catch (error) {
    console.error('Error finding carrier variations:', error);
    return [selectedCarrier]; // Fallback to original carrier
  }
};

// Configure multer for file upload
const storage = multer.memoryStorage();

// Updated file filter to accept both images and PDF
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pdfDocument') {
    // Check mime type for PDFs
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    return cb(new Error('Samo PDF datoteke su dozvoljene za pdfDocument!'), false);
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

// Get registrations with approved items for an acceptance
router.get('/acceptance/:acceptanceId/approved-registrations', auth, async (req, res) => {
  try {
    const { acceptanceId } = req.params;

    // Find all approved items linked to this acceptance
    const items = await Item.find({
      transportAcceptanceId: acceptanceId,
      approvalStatus: 'odobreno'
    }).select('registracija');

    // Extract unique registration first parts
    const registrations = items
      .filter(item => item.registracija)
      .map(item => getFirstPartOfRegistration(item.registracija));

    const uniqueRegistrations = [...new Set(registrations)];

    res.json({ approvedRegistrations: uniqueRegistrations });
  } catch (error) {
    console.error('Error fetching approved registrations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get item by acceptance ID and registration
router.get('/acceptance/:acceptanceId/registration/:registration', auth, async (req, res) => {
  try {
    const { acceptanceId, registration } = req.params;

    // Find the item with this acceptance and registration
    const item = await Item.findOne({
      transportAcceptanceId: acceptanceId,
      registracija: { $regex: new RegExp('^' + registration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
    })
      .populate('createdBy', 'firstName lastName email company')
      .populate('approvedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName')
      .populate({
        path: 'transportAcceptanceId',
        populate: {
          path: 'requestId',
          select: 'isplataPoT'
        }
      });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unique codes here
router.get('/codes', auth, async (req, res) => {
  try {
    // Apply the same filtering logic as the main items route
    let query = {};

    if (req.user.role !== 'admin' && !req.user.hasFullAccess) {
      // Non-admin users: filter by their codes
      query.code = { $in: req.user.codes };
    } else if (req.user.role === 'admin' && req.user.codes && req.user.codes.length > 0) {
      // Admin with codes assigned: filter by those codes
      query.code = { $in: req.user.codes };
    }
    // If admin with no codes assigned, show all codes (no extra filtering)

    const uniqueCodes = await Item.distinct('code', query);

    console.log('Codes query:', query);
    console.log('Found unique codes:', uniqueCodes.length);

    // 24042 is INCLUDED again here
    res.json(uniqueCodes.sort());
  } catch (err) {
    console.error('Error fetching unique codes:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/users', auth, async (req, res) => {
  try {
    console.log('Fetching unique users who created items...');

    // Build query based on user permissions (same logic as main items route)
    let matchQuery = {};

    if (req.user.role !== 'admin' && !req.user.hasFullAccess) {
      // Non-admin users: filter by their assigned codes
      if (req.user.codes && req.user.codes.length > 0) {
        matchQuery.code = { $in: req.user.codes };
      } else {
        // User with no codes assigned should see nothing
        return res.json([]);
      }
    } else if (req.user.role === 'admin' && req.user.codes && req.user.codes.length > 0) {
      // Admin with codes assigned: filter by those codes
      matchQuery.code = { $in: req.user.codes };
    }

    // Aggregate to get unique users with their info
    const uniqueUsers = await Item.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$createdBy',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: '$userInfo',
      },
      {
        $project: {
          _id: '$userInfo._id',
          firstName: '$userInfo.firstName',
          lastName: '$userInfo.lastName',
          email: '$userInfo.email',
          displayName: {
            $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'],
          },
        },
      },
      {
        $sort: { displayName: 1 },
      },
    ]);

    console.log('Found unique users:', uniqueUsers.length);
    res.json(uniqueUsers);
  } catch (err) {
    console.error('Error fetching unique users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get unique carriers (prijevoznik values) - BEFORE /:id route
router.get('/carriers', auth, async (req, res) => {
  try {
    // Apply the same filtering logic as the main items route
    let query = {};

    if (req.user.role !== 'admin' && !req.user.hasFullAccess) {
      // Non-admin users: filter by their codes
      query.code = { $in: req.user.codes };
    } else if (req.user.role === 'admin' && req.user.codes && req.user.codes.length > 0) {
      // Admin with codes assigned: filter by those codes
      query.code = { $in: req.user.codes };
    }
    // If admin with no codes assigned (empty array or null), show all carriers (no filtering)

    // Only get items that have a prijevoznik field
    query.prijevoznik = { $exists: true, $ne: null, $ne: '' };

    const uniqueCarriers = await Item.distinct('prijevoznik', query);

    console.log('Carriers query:', query);
    console.log('Found unique carriers:', uniqueCarriers.length);

    res.json(uniqueCarriers.sort());
  } catch (err) {
    console.error('Error fetching unique carriers:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unique registrations (registracija values) - BEFORE /:id route
router.get('/registrations', auth, async (req, res) => {
  try {
    // Apply the same filtering logic as the main items route
    let query = {};

    if (req.user.role !== 'admin' && !req.user.hasFullAccess) {
      // Non-admin users: filter by their codes
      query.code = { $in: req.user.codes };
    } else if (req.user.role === 'admin' && req.user.codes && req.user.codes.length > 0) {
      // Admin with codes assigned: filter by those codes
      query.code = { $in: req.user.codes };
    }
    // If admin with no codes assigned (empty array or null), show all registrations (no filtering)

    // Only get items that have a registracija field
    query.registracija = { $exists: true, $ne: null, $ne: '' };

    const uniqueRegistrations = await Item.distinct('registracija', query);

    console.log('Registrations query:', query);
    console.log('Found unique registrations:', uniqueRegistrations.length);

    res.json(uniqueRegistrations.sort());
  } catch (err) {
    console.error('Error fetching unique registrations:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
//get items
router.get('/', auth, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      code,
      prijevoznik,
      sortOrder = 'date-desc',
      searchTitle,
      searchRegistration,
      inTransitOnly,
      createdByUser,
      paidStatus,
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log('Items fetch request:', {
      userId: req.user._id,
      userRole: req.user.role,
      userCodes: req.user.codes,
      hasFullAccess: req.user.hasFullAccess,
      page,
      limit,
      filters: req.query,
    });

    let query = {};

    // Date filtering
    if (startDate || endDate) {
      query.creationDate = {};
      if (startDate) {
        query.creationDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.creationDate.$lte = endDateTime;
      }
    }

    // Code filtering - with access control
    if (req.user.role !== 'admin' && !req.user.hasFullAccess) {
      // Non-admin users: filter by their codes
      if (req.user.codes && req.user.codes.length > 0) {
        if (code && req.user.codes.includes(code)) {
          query.code = code;
        } else if (!code) {
          query.code = { $in: req.user.codes };
        } else {
          // User requested a code they don't have access to
          return res.json({
            items: [],
            pagination: {
              total: 0,
              page: 1,
              pages: 0,
              hasMore: false,
            },
            totalWeight: 0,
          });
        }
      } else {
        // User with no codes assigned should see nothing
        return res.json({
          items: [],
          pagination: {
            total: 0,
            page: 1,
            pages: 0,
            hasMore: false,
          },
          totalWeight: 0,
        });
      }
    } else if (req.user.role === 'admin' && req.user.codes && req.user.codes.length > 0) {
      // Admin with codes assigned: filter by those codes
      if (code && req.user.codes.includes(code)) {
        query.code = code;
      } else if (!code) {
        query.code = { $in: req.user.codes };
      } else {
        // Admin requested a code they don't have access to
        return res.json({
          items: [],
          pagination: {
            total: 0,
            page: 1,
            pages: 0,
            hasMore: false,
          },
          totalWeight: 0,
        });
      }
    } else {
      // Admin with no codes assigned (empty array or null): can see all
      if (code) {
        query.code = code;
      }
    }

    // Prijevoznik filtering
    if (prijevoznik) {
      query.prijevoznik = prijevoznik;
    }

    // Search filtering
    if (searchTitle) {
      query.title = { $regex: searchTitle, $options: 'i' };
    }

    if (searchRegistration) {
      query.registracija = { $regex: searchRegistration, $options: 'i' };
    }

    // In transit filtering
    if (inTransitOnly === 'true') {
      query.inTransit = true;
    }

    // Paid status filtering
    if (paidStatus === 'paid') {
      query.isPaid = true;
    } else if (paidStatus === 'unpaid') {
      query.isPaid = { $ne: true }; // treats missing field as unpaid
    }

    // Filter by user who created the item
    if (createdByUser) {
      if (createdByUser.includes(',')) {
        // Multiple user IDs
        const userIds = createdByUser.split(',').filter(id => id.trim());
        query.createdBy = { $in: userIds };
      } else {
        // Single user ID
        query.createdBy = createdByUser;
      }
    }

    console.log('Final query:', query);

    // Sort logic
    let sort = {};
    switch (sortOrder) {
      case 'date-asc':
        sort = { creationDate: 1 };
        break;
      case 'date-desc':
        sort = { creationDate: -1 };
        break;
      case 'pending-first':
        sort = {
          approvalStatus: 1,
          creationDate: -1,
        };
        break;
      case 'approved-first':
        sort = {
          approvalStatus: -1,
          creationDate: -1,
        };
        break;
      default:
        sort = { creationDate: -1 };
    }

    // Get paginated items
    const items = await Item.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Item.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // FIXED: Calculate total weight for ALL filtered items, not just paginated ones
    const totalWeightResult = await Item.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalWeight: { $sum: { $ifNull: ['$tezina', 0] } },
        },
      },
    ]);

    const totalWeight = totalWeightResult.length > 0 ? totalWeightResult[0].totalWeight : 0;

    res.json({
      items,
      pagination: {
        total,
        page,
        pages: totalPages,
        hasMore: page < totalPages,
      },
      totalWeight: totalWeight, // This now includes ALL filtered items
    });
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific item - AFTER all specific routes
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('approvedBy', 'firstName lastName');

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Apply the same access control logic
    // Allow access if:
    // 1. User is admin with no codes assigned (full access)
    // 2. User is admin or non-admin and has the item's code in their codes array
    // 3. User has full access flag set

    const hasAccess =
      (user.role === 'admin' && (!user.codes || user.codes.length === 0)) || // Admin with no codes
      user.codes.includes(item.code) || // User has the specific code
      user.hasFullAccess; // User has full access flag

    if (!hasAccess) {
      console.log('Access denied for user:', user._id, 'to item:', item._id);
      console.log('User role:', user.role);
      console.log('User codes:', user.codes);
      console.log('Item code:', item.code);
      console.log('User hasFullAccess:', user.hasFullAccess);
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(item);
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new item - Complete POST route
router.post('/', auth, async (req, res) => {
  try {
    // Only admin and bot users can create items
    if (req.user.role !== 'admin' && req.user.role !== 'bot') {
      return res.status(403).json({ message: 'Access denied. Admin or Bot users only.' });
    }

    // Extract fields from request body including prijevoznik
    const { title, code, registracija, neto, tezina, prijevoznik, pdfUrl, creationDate } = req.body;

    console.log('Creating item with data:', {
      title: title?.substring(0, 50) + '...',
      code,
      registracija,
      neto,
      tezina,
      prijevoznik,
      hasTitle: !!title,
      createdBy: req.user._id, // LOG the user who is creating
    });

    // Validate required fields
    if (!title || !code || !pdfUrl) {
      return res.status(400).json({
        message: 'Title, code, and pdfUrl are required',
      });
    }

    // Check if an item with the same title already exists
    const existingItem = await Item.findOne({ title: title.trim() });

    if (existingItem) {
      console.log('Found existing item with same title:', existingItem._id);

      // Delete the existing item (including any associated files)
      if (existingItem.approvalPhotoFront?.publicId) {
        try {
          await cloudinary.uploader.destroy(existingItem.approvalPhotoFront.publicId);
          console.log('Deleted old front photo from Cloudinary');
        } catch (error) {
          console.error('Error deleting old front photo:', error);
        }
      }

      if (existingItem.approvalPhotoBack?.publicId) {
        try {
          await cloudinary.uploader.destroy(existingItem.approvalPhotoBack.publicId);
          console.log('Deleted old back photo from Cloudinary');
        } catch (error) {
          console.error('Error deleting old back photo:', error);
        }
      }

      if (existingItem.approvalDocument?.publicId) {
        try {
          await cloudinary.uploader.destroy(existingItem.approvalDocument.publicId);
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

    // Create the new item object with all fields including createdBy
    const item = new Item({
      title: title.trim(),
      code: extractRNFromFilename(title, code.trim()),
      registracija: registracija ? registracija.trim() : undefined,
      prijevoznik: prijevoznik && prijevoznik.trim() ? prijevoznik.trim() : undefined,
      pdfUrl: pdfUrl.trim(),
      createdBy: req.user._id, // ADD THIS LINE - Store who created the item
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
        neto !== undefined && neto !== null && neto !== '' ? parseFloat(neto) : tezinaValue;

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

    // Save the new item
    const newItem = await item.save();
    console.log('Created new item:', {
      id: newItem._id,
      title: newItem.title.substring(0, 50) + '...',
      neto: newItem.neto,
      tezina: newItem.tezina,
      prijevoznik: newItem.prijevoznik,
      createdBy: newItem.createdBy, // LOG the creator
    });

    // After saving the item, check if there's an approved transport acceptance with matching code
    // and available slots (linked approved items < acceptedCount)
    if (newItem.registracija && newItem.code) {
      const matchingAcceptances = await TransportAcceptance.find({
        status: 'approved',
        gradiliste: newItem.code,
      }).sort({ createdAt: 1 }); // Get oldest first

      for (const matchingAcceptance of matchingAcceptances) {
        // Count how many approved items are already linked to this acceptance
        const linkedItemsCount = await Item.countDocuments({
          transportAcceptanceId: matchingAcceptance._id,
          approvalStatus: 'odobreno'
        });

        // If there are available slots, link this item
        if (linkedItemsCount < matchingAcceptance.acceptedCount) {
          newItem.transportAcceptanceId = matchingAcceptance._id;
          await newItem.save();

          // Add the registration to the acceptance's registrations array
          const itemFirstPart = getFirstPartOfRegistration(newItem.registracija);
          if (!matchingAcceptance.registrations.some(reg => getFirstPartOfRegistration(reg) === itemFirstPart)) {
            matchingAcceptance.registrations.push(newItem.registracija);
            await matchingAcceptance.save();
          }

          console.log('Linked item to transport acceptance:', {
            itemId: newItem._id,
            acceptanceId: matchingAcceptance._id,
            registration: newItem.registracija
          });
          break;
        }
      }
    }

    res.status(201).json(newItem);
  } catch (err) {
    console.error('Error creating item:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});
// Update item code (admin only) - Allow duplicate codes
router.patch('/:id/code', auth, async (req, res) => {
  try {
    console.log('=== CODE UPDATE DEBUG START ===');
    console.log('Item ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.user._id);
    console.log('User role:', req.user.role);
    console.log('===============================');

    // Only admins can edit codes
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied - non-admin user attempted code edit');
      return res.status(403).json({
        message: 'Access denied. Admin only.',
        messageHr: 'Pristup odbijen. Samo administratori.',
      });
    }

    console.log('✅ Admin check passed');

    const { code } = req.body;
    console.log('Extracted code from request:', code);

    // Validate the new code
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      console.log('❌ Code validation failed:', { code, type: typeof code });
      return res.status(400).json({
        message: 'Code is required and cannot be empty',
        messageHr: 'Kod je obavezan i ne može biti prazan',
      });
    }

    const trimmedCode = code.trim();
    console.log('✅ Code validation passed. Trimmed code:', trimmedCode);

    // REMOVED: Duplicate code check - allow multiple items to have the same code
    console.log('ℹ️  Allowing duplicate codes as per admin requirements');

    // Find and update the item
    console.log('🔍 Finding item by ID...');
    const item = await Item.findById(req.params.id);

    if (!item) {
      console.log('❌ Item not found:', req.params.id);
      return res.status(404).json({
        message: 'Item not found',
        messageHr: 'Stavka nije pronađena',
      });
    }

    console.log('✅ Item found:', {
      id: item._id,
      currentCode: item.code,
      title: item.title.substring(0, 50),
    });

    // Check if admin has access to this item
    console.log('🔍 Checking user access...');
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('❌ User not found:', req.user._id);
      return res.status(404).json({
        message: 'User not found',
        messageHr: 'Korisnik nije pronađen',
      });
    }

    console.log('✅ User found:', {
      id: user._id,
      role: user.role,
      codes: user.codes,
      hasFullAccess: user.hasFullAccess,
    });

    // Apply access control logic
    const hasAccess =
      (user.role === 'admin' && (!user.codes || user.codes.length === 0)) || // Admin with no codes
      user.codes.includes(item.code) || // User has the specific code
      user.hasFullAccess; // User has full access flag

    console.log('🔐 Access control check:', {
      isAdminWithNoCodes: user.role === 'admin' && (!user.codes || user.codes.length === 0),
      hasSpecificCode: user.codes.includes(item.code),
      hasFullAccess: user.hasFullAccess,
      finalAccess: hasAccess,
    });

    if (!hasAccess) {
      console.log('❌ Access denied for user:', user._id, 'to item:', item._id);
      return res.status(403).json({
        message: 'Access denied to this item',
        messageHr: 'Pristup ovoj stavci je odbijen',
      });
    }

    console.log('✅ Access control passed');

    // Store the old code for logging
    const oldCode = item.code;

    // Update the code (duplicates are now allowed)
    console.log('💾 Updating code from', oldCode, 'to', trimmedCode);
    item.code = trimmedCode;

    console.log('💾 Saving item...');
    await item.save();

    console.log('=== CODE UPDATE SUCCESS ===');
    console.log('Item ID:', item._id);
    console.log('Old code:', oldCode);
    console.log('New code:', trimmedCode);
    console.log('Updated by admin:', user.email);
    console.log('==========================');

    // Populate the response with admin info
    await item.populate('approvedBy', 'firstName lastName');

    const response = {
      success: true,
      message: 'Code updated successfully',
      messageHr: 'Kod je uspješno ažuriran',
      item: item,
      changes: {
        oldCode,
        newCode: trimmedCode,
        updatedBy: {
          id: user._id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        },
        updatedAt: new Date(),
      },
    };

    console.log('📤 Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('=== CODE UPDATE ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Item ID:', req.params.id);
    console.error('Request body:', req.body);
    console.error('User:', req.user._id);
    console.error('========================');

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        messageHr: 'Greška u validaciji',
        details: error.message,
      });
    }

    res.status(500).json({
      message: 'Server error during code update',
      messageHr: 'Greška servera tijekom ažuriranja koda',
      error: error.message,
      errorId: Math.random().toString(36).substring(7),
    });
  }
});

// Optional: Add an endpoint to get code update history/audit log
router.get('/:id/code-history', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Admin only.',
        messageHr: 'Pristup odbijen. Samo administratori.',
      });
    }

    // This would require a separate CodeHistory model/collection
    // For now, just return a placeholder response
    res.json({
      message: 'Code history feature not yet implemented',
      messageHr: 'Funkcija povijesti kodova još nije implementirana',
      itemId: req.params.id,
    });
  } catch (error) {
    console.error('Error fetching code history:', error);
    res.status(500).json({
      message: 'Server error',
      messageHr: 'Greška servera',
    });
  }
});

// Utility function to validate code format (you can customize this)
const validateCodeFormat = code => {
  // Example: Code should be alphanumeric and 3-20 characters
  const codeRegex = /^[A-Za-z0-9_-]{3,20}$/;
  return codeRegex.test(code);
};

// Enhanced validation endpoint
router.post('/validate-code', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Admin only.',
      });
    }

    const { code, itemId } = req.body;

    if (!code) {
      return res.status(400).json({
        valid: false,
        message: 'Code is required',
        messageHr: 'Kod je obavezan',
      });
    }

    const trimmedCode = code.trim();

    // Check format
    if (!validateCodeFormat(trimmedCode)) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid code format. Use 3-20 alphanumeric characters, hyphens, or underscores.',
        messageHr:
          'Neispravan format koda. Koristite 3-20 alfanumeričkih znakova, crtice ili podvlake.',
      });
    }

    // Check for duplicates
    const query = { code: trimmedCode };
    if (itemId) {
      query._id = { $ne: itemId };
    }

    const existingItem = await Item.findOne(query);

    if (existingItem) {
      return res.json({
        valid: false,
        message: 'Code already exists',
        messageHr: 'Kod već postoji',
        conflictingItem: {
          id: existingItem._id,
          title: existingItem.title,
        },
      });
    }

    res.json({
      valid: true,
      message: 'Code is available',
      messageHr: 'Kod je dostupan',
    });
  } catch (error) {
    console.error('Error validating code:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error during validation',
      messageHr: 'Greška servera tijekom validacije',
    });
  }
});

// Update an item (admin only)
router.patch('/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { title, code, neto, tezina, pdfUrl, creationDate } = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
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
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark item as paid/unpaid (admin only)
router.patch('/:id/pay', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Access denied - non-admin attempted to mark paid');
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { isPaid = true } = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.isPaid = !!isPaid;
    item.paidAt = item.isPaid ? new Date() : null;
    item.paidBy = item.isPaid ? req.user._id : null;

    await item.save();
    await item.populate('paidBy', 'firstName lastName email');

    res.json(item);
  } catch (err) {
    console.error('Error marking item as paid:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// FIXED APPROVAL ENDPOINT - Store approvalDate as Date object, not string
router.patch(
  '/:id/approval',
  auth,
  upload.fields([
    { name: 'photoFront', maxCount: 1 },
    { name: 'photoBack', maxCount: 1 },
    { name: 'pdfDocument', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Enhanced logging to debug mobile app issues
      const userAgent = req.headers['user-agent'] || '';
      const isMobileApp = userAgent.includes('okhttp') || userAgent.includes('ReactNative');

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
        return res.status(404).json({ message: 'Item not found' });
      }

      console.log('Found item:', {
        id: item._id,
        title: item.title.substring(0, 50),
        currentStatus: item.approvalStatus,
        currentTezina: item.tezina,
        currentNeto: item.neto,
      });

      // Extract and validate approval status
      const { approvalStatus, locationData, inTransit, neto } = req.body;

      if (!approvalStatus) {
        console.error('Missing approval status');
        return res.status(400).json({ message: 'Approval status is required' });
      }

      if (!['odobreno', 'odbijen'].includes(approvalStatus)) {
        console.error('Invalid approval status:', approvalStatus);
        return res.status(400).json({ message: 'Invalid approval status' });
      }

      // Update basic approval fields
      item.approvalStatus = approvalStatus;

      // FIX: Store approvalDate as Date object, not Croatian string
      item.approvalDate = new Date(); // This will be converted to Croatian string in toJSON method

      item.approvedBy = req.user._id;

      console.log('Updated basic approval fields:', {
        approvalStatus: item.approvalStatus,
        approvalDate: item.approvalDate, // This is now a Date object
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
        console.log('Set in_transit to:', item.in_transit, 'from:', inTransit, typeof inTransit);
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
              accuracy: typeof location.accuracy === 'number' ? location.accuracy : 0,
              timestamp: location.timestamp ? new Date(location.timestamp) : new Date(),
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
            console.log('Front photo uploaded successfully:', frontResponse.publicId);

            // Delete old front photo if exists
            if (item.approvalPhotoFront && item.approvalPhotoFront.publicId) {
              try {
                await cloudinary.uploader.destroy(item.approvalPhotoFront.publicId);
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
            console.log('Back photo uploaded successfully:', backResponse.publicId);

            // Delete old back photo if exists
            if (item.approvalPhotoBack && item.approvalPhotoBack.publicId) {
              try {
                await cloudinary.uploader.destroy(item.approvalPhotoBack.publicId);
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
                await cloudinary.uploader.destroy(item.approvalDocument.publicId);
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
          approvalDate: item.approvalDate, // Now a Date object
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

        // If item was approved and has a registration, try to link it to a transport acceptance
        if (updatedItem.approvalStatus === 'odobreno' && updatedItem.registracija && updatedItem.code && !updatedItem.transportAcceptanceId) {
          // Find all approved acceptances with matching code and available slots
          const matchingAcceptances = await TransportAcceptance.find({
            status: 'approved',
            gradiliste: updatedItem.code,
          }).sort({ createdAt: 1 });

          for (const matchingAcceptance of matchingAcceptances) {
            // Count how many approved items are already linked to this acceptance
            const linkedItemsCount = await Item.countDocuments({
              transportAcceptanceId: matchingAcceptance._id,
              approvalStatus: 'odobreno'
            });

            // If there are available slots, link this item
            if (linkedItemsCount < matchingAcceptance.acceptedCount) {
              updatedItem.transportAcceptanceId = matchingAcceptance._id;
              await updatedItem.save();

              // Add the registration to the acceptance's registrations array
              const itemFirstPart = getFirstPartOfRegistration(updatedItem.registracija);
              if (!matchingAcceptance.registrations.some(reg => getFirstPartOfRegistration(reg) === itemFirstPart)) {
                matchingAcceptance.registrations.push(updatedItem.registracija);
                await matchingAcceptance.save();
              }

              console.log('Linked approved item to transport acceptance:', {
                itemId: updatedItem._id,
                acceptanceId: matchingAcceptance._id,
                registration: updatedItem.registracija
              });
              break;
            }
          }
        }

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
  }
);

// Delete an item (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Delete request received for item:', req.params.id);

    if (req.user.role !== 'admin') {
      console.log('Access denied - non-admin user attempted deletion');
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      console.log('Item not found:', req.params.id);
      return res.status(404).json({ message: 'Item not found' });
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
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error during item deletion:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
