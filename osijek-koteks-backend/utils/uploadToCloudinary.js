const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = async file => {
  try {
    console.log('Starting Cloudinary upload...');
    // Convert the buffer to base64
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = 'data:' + file.mimetype + ';base64,' + b64;

    console.log('About to upload to Cloudinary...');
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'approval-photos',
      resource_type: 'auto',
    });
    console.log('Cloudinary upload result:', result);

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

module.exports = uploadToCloudinary;
