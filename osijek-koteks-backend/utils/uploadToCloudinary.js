const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');

const uploadToCloudinary = async file => {
  try {
    console.log('Starting file upload process...');
    console.log('File mimetype:', file.mimetype);

    let fileBuffer = file.buffer;
    let dataURI;

    // Set upload options based on file type
    const uploadOptions = {
      folder: 'approval-files',
    };

    // Handle different file types
    if (file.mimetype === 'application/pdf') {
      console.log('Processing PDF file...');
      const b64 = fileBuffer.toString('base64');
      dataURI = 'data:' + file.mimetype + ';base64,' + b64;

      // Set resource_type to 'raw' for PDFs and add .pdf extension
      uploadOptions.resource_type = 'raw';
      uploadOptions.public_id = `pdf-${Date.now()}.pdf`; // Force .pdf extension
    } else {
      // For images, process with Sharp
      console.log('Processing image file...');
      try {
        // Process the image with Sharp
        const processedImageBuffer = await sharp(fileBuffer)
          .resize(1200, 1200, {
            // Max dimensions
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({
            // Convert to JPEG
            quality: 70, // Reduce quality
            mozjpeg: true, // Use mozjpeg compression
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

        // Convert the processed buffer to base64
        const b64 = processedImageBuffer.toString('base64');
        dataURI = 'data:' + file.mimetype + ';base64,' + b64;
      } catch (error) {
        console.error('Error in image processing:', error);
        // Fallback to original file if Sharp processing fails
        const b64 = fileBuffer.toString('base64');
        dataURI = 'data:' + file.mimetype + ';base64,' + b64;
      }

      // Set resource_type and options for images
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
