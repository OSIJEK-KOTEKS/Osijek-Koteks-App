const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');

const uploadToCloudinary = async file => {
  try {
    console.log('Starting image processing...');

    // Convert the buffer to processable image data
    let imageBuffer = file.buffer;

    // Process the image with Sharp
    const processedImageBuffer = await sharp(imageBuffer)
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
      ((processedImageBuffer.length / file.buffer.length) * 100).toFixed(2) +
        '%',
    );

    // Convert the processed buffer to base64
    const b64 = processedImageBuffer.toString('base64');
    const dataURI = 'data:' + file.mimetype + ';base64,' + b64;

    console.log('About to upload to Cloudinary...');
    // Upload to Cloudinary with additional optimization options
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'approval-photos',
      resource_type: 'auto',
      quality_analysis: true, // Get quality analysis in response
      transformation: [
        {quality: 'auto:good'}, // Let Cloudinary optimize further if needed
      ],
    });

    console.log('Cloudinary upload result:', result);

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Error in image processing/upload:', error);
    throw error;
  }
};

module.exports = uploadToCloudinary;
