const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');
const path = require('path');

// Function to sanitize filename for Cloudinary
const sanitizeFilename = filename => {
  if (!filename) return 'document';

  return (
    filename
      // Remove file extension first
      .replace(/\.[^/.]+$/, '')
      // Replace Croatian characters with ASCII equivalents
      .replace(/[čćžšđČĆŽŠĐ]/g, match => {
        const replacements = {
          č: 'c',
          ć: 'c',
          ž: 'z',
          š: 's',
          đ: 'd',
          Č: 'C',
          Ć: 'C',
          Ž: 'Z',
          Š: 'S',
          Đ: 'D',
        };
        return replacements[match] || match;
      })
      // Replace spaces with underscores
      .replace(/\s+/g, '_')
      // Remove or replace special characters that can cause issues
      .replace(/[#@+&$%!?*()[\]{}|\\:";'<>,.]/g, '_')
      // Replace multiple underscores with single underscore
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
      // Limit length to avoid issues (Cloudinary has limits)
      .substring(0, 100) ||
    // Ensure we have something if everything was removed
    'document'
  );
};

const uploadToCloudinary = async file => {
  try {
    console.log('Starting file upload process...');
    console.log('File details:', {
      mimetype: file.mimetype,
      originalname: file.originalname || 'document.pdf',
    });

    let fileBuffer = file.buffer;
    let dataURI;

    // Set upload options based on file type
    const uploadOptions = {
      folder: 'approval-files',
    };

    // Handle different file types
    if (file.mimetype === 'application/pdf') {
      // Sanitize the filename
      const sanitizedFilename = sanitizeFilename(file.originalname);
      const timestamp = Date.now();
      const uniqueFilename = `${sanitizedFilename}_${timestamp}`;

      console.log('Processing PDF file:', {
        original: file.originalname,
        sanitized: sanitizedFilename,
        final: uniqueFilename,
      });

      // For PDFs, just convert buffer to base64 without processing with Sharp
      const b64 = fileBuffer.toString('base64');
      dataURI = 'data:' + file.mimetype + ';base64,' + b64;

      // Use application/pdf type instead of image or raw
      uploadOptions.resource_type = 'raw';
      uploadOptions.public_id = uniqueFilename; // No extension in public_id
      uploadOptions.type = 'upload';

      console.log('Using PDF upload options:', uploadOptions);
    } else {
      // For images, process with Sharp (unchanged)
      console.log('Processing image file...');
      try {
        const processedImageBuffer = await sharp(fileBuffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 70,
            mozjpeg: true,
          })
          .toBuffer();

        console.log(
          'Image processed. Original size:',
          file.buffer.length,
          'Compressed size:',
          processedImageBuffer.length,
          'Compression ratio:',
          ((processedImageBuffer.length / file.buffer.length) * 100).toFixed(2) + '%'
        );

        const b64 = processedImageBuffer.toString('base64');
        dataURI = 'data:' + file.mimetype + ';base64,' + b64;
      } catch (error) {
        console.error('Error in image processing:', error);
        const b64 = fileBuffer.toString('base64');
        dataURI = 'data:' + file.mimetype + ';base64,' + b64;
      }

      uploadOptions.resource_type = 'image';
      uploadOptions.quality_analysis = true;
      uploadOptions.transformation = [{ quality: 'auto:good' }];
    }

    console.log('About to upload to Cloudinary with options:', uploadOptions);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);
    console.log('Cloudinary upload result:', {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      resourceType: result.resource_type,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Error in file upload process:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = uploadToCloudinary;
