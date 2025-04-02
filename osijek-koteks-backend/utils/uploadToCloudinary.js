const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');
const path = require('path');

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
      // Generate a unique filename with PDF extension
      const timestamp = Date.now();
      const filename = file.originalname
        ? path.parse(file.originalname).name // Get filename without extension
        : `document`;

      // For PDFs, just convert buffer to base64 without processing with Sharp
      console.log('Processing PDF file:', filename);
      const b64 = fileBuffer.toString('base64');
      dataURI = 'data:' + file.mimetype + ';base64,' + b64;

      // Set resource_type to 'auto' for PDFs and ensure .pdf extension in public_id
      uploadOptions.resource_type = 'auto';
      uploadOptions.public_id = `${filename}-${timestamp}.pdf`; // Force .pdf extension
      uploadOptions.format = 'pdf';
      uploadOptions.flags = 'attachment';

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
          ((processedImageBuffer.length / file.buffer.length) * 100).toFixed(
            2,
          ) + '%',
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
      uploadOptions.transformation = [{quality: 'auto:good'}];
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
    throw error;
  }
};

module.exports = uploadToCloudinary;
