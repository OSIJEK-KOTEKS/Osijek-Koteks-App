const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const multer = require('multer');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const axios = require('axios');
const JSZip = require('jszip');

const ensureRacuniAccess = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.canAccessRacuni) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Racuni access required.' });
};

const DOBAVLJACI = ['KAMEN - PSUNJ d.o.o.', 'MOLARIS d.o.o.', 'VELIČKI KAMEN d.o.o.'];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    return cb(new Error('Only PDF files are allowed for bill attachments'), false);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const normalizeItemIds = rawItemIds => {
  if (Array.isArray(rawItemIds)) {
    return rawItemIds;
  }

  if (typeof rawItemIds === 'string') {
    try {
      const parsed = JSON.parse(rawItemIds);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (err) {
      return rawItemIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const baseBillQuery = () =>
  Bill.find().populate({
    path: 'items',
    select:
      'title code pdfUrl creationDate registracija prijevoznik approvalStatus in_transit isPaid neto tezina approvalLocation approvalDocument approvalPhotoFront approvalPhotoBack',
  });

const sanitizeName = (value, fallback = 'bill-items') => {
  if (!value || typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim().replace(/[^\w.-]+/g, '-');
};

const getGoogleDriveDownloadUrl = url => {
  const driveIdMatch =
    url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/open\?id=([a-zA-Z0-9_-]+)/);

  if (driveIdMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveIdMatch[1]}`;
  }

  return url;
};

const getPdfDownloadUrl = (url, req) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    return getGoogleDriveDownloadUrl(url);
  }

  if (url.startsWith('http')) return url;
  return `${req.protocol}://${req.get('host')}${url}`;
};

const getItemPdfDownloadName = item => {
  const baseName = item.title || item.code || 'item-pdf';
  const normalized = baseName.trim().replace(/\s+/g, '-');
  return normalized.toLowerCase().endsWith('.pdf') ? normalized : `${normalized}.pdf`;
};

// Get bills for current user (admins see all)
router.get('/', auth, ensureRacuniAccess, async (req, res) => {
  try {
    const bills = await baseBillQuery().find().populate('createdBy', 'firstName lastName email');
    res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create bill
router.post('/', auth, ensureRacuniAccess, upload.single('billPdf'), async (req, res) => {
  try {
    const { title, description, dobavljac } = req.body;
    const itemIds = normalizeItemIds(req.body.itemIds);

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

    let attachment = null;

    if (req.file) {
      const uploadedPdf = await uploadToCloudinary(req.file);
      attachment = {
        url: uploadedPdf.url,
        publicId: uploadedPdf.publicId,
        uploadDate: new Date(),
        mimeType: req.file.mimetype,
        originalName: req.file.originalname || null,
      };
    }

    const bill = new Bill({
      title: title.trim(),
      dobavljac,
      description: description ? description.trim() : '',
      items: uniqueItemIds,
      createdBy: req.user._id,
      attachment,
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

// Download bill items as ZIP
router.get('/:id/zip', auth, ensureRacuniAccess, async (req, res) => {
  try {
    const bill = await baseBillQuery().findById(req.params.id).populate('createdBy', 'firstName lastName email');
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (req.user.role !== 'admin' && bill.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const itemsWithPdf = bill.items.filter(item => item.pdfUrl);
    if (itemsWithPdf.length === 0) {
      return res.status(404).json({ message: 'No PDFs to download' });
    }

    const zip = new JSZip();
    let added = 0;

    for (const item of itemsWithPdf) {
      const downloadUrl = getPdfDownloadUrl(item.pdfUrl, req);
      if (!downloadUrl) continue;

      try {
        const response = await axios.get(downloadUrl, {
          responseType: 'arraybuffer',
          timeout: 20000,
        });

        zip.file(getItemPdfDownloadName(item), response.data);
        added += 1;
      } catch (err) {
        console.error('Failed to fetch PDF for zip:', { downloadUrl, error: err?.message });
      }
    }

    if (added === 0) {
      return res.status(502).json({ message: 'Unable to fetch PDFs for zipping' });
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipName = `${sanitizeName(bill.title || 'bill')}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
    });

    return res.send(zipBuffer);
  } catch (error) {
    console.error('Error generating bill zip:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
