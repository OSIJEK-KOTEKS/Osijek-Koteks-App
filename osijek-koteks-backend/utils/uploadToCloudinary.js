const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');

const uploadToCloudinary = async file => {
  try {
    console.log('Starting file upload process...');
    console.log('File mimetype:', file.mimetype);

    let fileBuffer = file.buffer;
    let dataURI;

    if (file.mimetype === 'application/pdf') {
      // For PDFs, just convert buffer to base64 without processing with Sharp
      console.log('Processing PDF file...');
      const b64 = fileBuffer.toString('base64');
      dataURI = 'data:' + file.mimetype + ';base64,' + b64;
    } else {
      // For images, process with Sharp
      console.log('Processing image file...');
      // Convert the buffer to processable image data
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
    }

    console.log('About to upload to Cloudinary...');
    // Upload to Cloudinary
    const uploadOptions = {
      folder: 'approval-files',
      resource_type: 'auto', // This is crucial for PDFs - allows Cloudinary to automatically detect file type
    };

    // Add quality analysis and transformation only for images
    if (file.mimetype.startsWith('image/')) {
      uploadOptions.quality_analysis = true;
      uploadOptions.transformation = [{quality: 'auto:good'}];
    }

    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);
    console.log('Cloudinary upload result:', result);

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
