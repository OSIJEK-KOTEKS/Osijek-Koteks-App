const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const multer = require('multer');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const axios = require('axios');
const JSZip = require('jszip');
const { PDFDocument, StandardFonts } = require('pdf-lib');

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
      'title code pdfUrl creationDate creationTime registracija prijevoznik approvalStatus approvalDate approvedBy in_transit isPaid neto tezina approvalLocation approvalDocument approvalPhotoFront approvalPhotoBack',
    populate: { path: 'approvedBy', select: 'firstName lastName email' },
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

const getBillAttachmentName = attachment => {
  const baseName =
    (attachment && (attachment.originalName || (attachment.url && attachment.url.split('/').pop()))) || 'bill-attachment';
  const normalized = baseName.trim().replace(/\s+/g, '-');
  return normalized.toLowerCase().endsWith('.pdf') ? normalized : `${normalized}.pdf`;
};

const getAbsoluteUrl = (url, req) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${req.protocol}://${req.get('host')}${url}`;
};

const toAscii = value =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '');

const safeText = value => (value !== undefined && value !== null ? toAscii(String(value)) : 'N/A');

const parseDateValue = value => {
  if (!value) return null;
  const parsed = value && typeof value === 'object' && '$date' in value ? value.$date : value;
  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateAndTime = (creationDate, creationTime) => {
  const date = parseDateValue(creationDate);
  if (!date && !creationTime) return 'N/A';
  const datePart = date
    ? date.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zagreb' })
    : safeText(creationDate);
  return creationTime ? `${datePart} ${creationTime}` : datePart;
};

const formatTimeOnly = (dateValue, explicitTime) => {
  if (explicitTime) return safeText(explicitTime);
  const date = parseDateValue(dateValue);
  if (!date) return 'N/A';
  return date.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zagreb' });
};

const formatApprovalDate = approvalDate => {
  const date = parseDateValue(approvalDate);
  if (!date) return safeText(approvalDate);
  return date.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zagreb',
  });
};

const buildBillItemsDetailPdf = async (bill, req) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 40;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const nextLine = (gap = 16) => {
    y -= gap;
    if (y < MARGIN + 60) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLabelValue = (label, value) => {
    page.drawText(toAscii(label), { x: MARGIN, y, size: 11, font: boldFont });
    page.drawText(toAscii(value), { x: MARGIN + 140, y, size: 11, font });
    nextLine(14);
  };

  const embedPhoto = async (photo, label) => {
    if (!photo?.url) return;

    const absoluteUrl = getAbsoluteUrl(photo.url, req);
    try {
      const response = await axios.get(absoluteUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const bytes = response.data;
      const mime = photo.mimeType || response.headers['content-type'] || '';
      const image =
        mime.includes('png') || absoluteUrl.toLowerCase().endsWith('.png')
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);

      const maxWidth = 220;
      const maxHeight = 180;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;

      if (y - drawHeight - 40 < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      page.drawText(toAscii(label), { x: MARGIN, y, size: 11, font: boldFont });
      y -= 16;
      page.drawImage(image, { x: MARGIN, y: y - drawHeight, width: drawWidth, height: drawHeight });
      y -= drawHeight + 12;
    } catch (err) {
      console.error('Failed to embed approval photo in bill items PDF', { url: absoluteUrl, error: err?.message });
    }
  };

  page.drawText(toAscii('Stavke računa'), { x: MARGIN, y, size: 16, font: boldFont });
  nextLine(22);
  page.drawText(toAscii(`Račun: ${safeText(bill.title)}`), { x: MARGIN, y, size: 12, font });
  nextLine(18);

  for (let index = 0; index < bill.items.length; index += 1) {
    const item = bill.items[index];
    page.drawText(`#${index + 1} ${safeText(item.title)}`, { x: MARGIN, y, size: 13, font: boldFont });
    nextLine(18);
    drawLabelValue('RN', safeText(item.code));
    drawLabelValue('Registracija', safeText(item.registracija));
    const weightValue =
      typeof item.tezina === 'number'
        ? `${(item.tezina / 1000).toFixed(3)} t`
        : typeof item.neto === 'number'
        ? `${item.neto} kg`
        : 'N/A';
    drawLabelValue('Težina', weightValue);
    drawLabelValue('Datum kreiranja', formatDateAndTime(item.creationDate, item.creationTime));
    drawLabelValue('Vrijeme kreiranja', formatTimeOnly(item.creationDate, item.creationTime));
    drawLabelValue('Status', safeText(item.approvalStatus));
    const approvedByName = item.approvedBy
      ? `${safeText(item.approvedBy.firstName)} ${safeText(item.approvedBy.lastName)}`
      : 'N/A';
    drawLabelValue('Odobrio', approvedByName);
    drawLabelValue('Datum odobrenja', formatApprovalDate(item.approvalDate));
    nextLine(14);

    await embedPhoto(item.approvalPhotoFront, 'Prednja slika');
    await embedPhoto(item.approvalPhotoBack, 'Stražnja slika');
    nextLine(8);
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
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
    const folder = zip.folder(sanitizeName(bill.title || 'bill')) || zip;
    let added = 0;

    if (bill.attachment?.url) {
      const attachmentUrl = getPdfDownloadUrl(bill.attachment.url, req);
      try {
        const response = await axios.get(attachmentUrl, {
          responseType: 'arraybuffer',
          maxRedirects: 5,
          validateStatus: status => status >= 200 && status < 400,
          timeout: 20000,
        });
        folder.file(getBillAttachmentName(bill.attachment), response.data);
        added += 1;
      } catch (err) {
        console.error('Failed to fetch bill attachment for zip:', { attachmentUrl, error: err?.message });
      }
    }

    for (const item of itemsWithPdf) {
      const downloadUrl = getPdfDownloadUrl(item.pdfUrl, req);
      if (!downloadUrl) continue;

      try {
        const response = await axios.get(downloadUrl, {
          responseType: 'arraybuffer',
          maxRedirects: 5,
          validateStatus: status => status >= 200 && status < 400,
          timeout: 20000,
        });

        folder.file(getItemPdfDownloadName(item), response.data);
        added += 1;
      } catch (err) {
        console.error('Failed to fetch PDF for zip:', { downloadUrl, error: err?.message });
      }
    }

    if (added === 0) {
      return res.status(502).json({ message: 'Unable to fetch PDFs for zipping' });
    }

    try {
      const detailPdf = await buildBillItemsDetailPdf(bill, req);
      folder.file(`${sanitizeName(bill.title || 'bill')}-stavke.pdf`, detailPdf);
      added += 1;
    } catch (err) {
      console.error('Failed to generate bill items detail PDF for zip:', err?.message);
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
