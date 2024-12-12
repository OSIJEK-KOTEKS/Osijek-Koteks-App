// controllers/approvalController.js
const uploadToCloudinary = require('../osijek-koteks-backend/utils/uploadToCloudinary');

// Your approval endpoint
const createApproval = async (req, res) => {
  try {
    // Assuming req.file contains the uploaded image from multer
    if (!req.file) {
      return res.status(400).json({error: 'No image provided'});
    }

    // Upload to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(req.file);

    // Create the approval document
    const approval = new Approval({
      title: req.body.title,
      code: req.body.code,
      pdfUrl: req.body.pdfUrl,
      creationDate: new Date(),
      creationTime: req.body.creationTime,
      approvalStatus: req.body.approvalStatus,
      approvalDate: new Date(),
      approvedBy: req.body.approvedBy,
      approvalPhoto: {
        url: cloudinaryResponse.url,
        uploadDate: new Date(),
        mimeType: req.file.mimetype,
        publicId: cloudinaryResponse.publicId, // Store this for future reference/deletion
      },
      approvalLocation: req.body.approvalLocation,
    });

    await approval.save();
    res.status(201).json(approval);
  } catch (error) {
    console.error('Error in createApproval:', error);
    res.status(500).json({error: 'Error creating approval'});
  }
};

const deleteApproval = async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({error: 'Approval not found'});
    }

    // Delete from Cloudinary if publicId exists
    if (approval.approvalPhoto && approval.approvalPhoto.publicId) {
      await cloudinary.uploader.destroy(approval.approvalPhoto.publicId);
    }

    await approval.remove();
    res.json({message: 'Approval deleted successfully'});
  } catch (error) {
    console.error('Error in deleteApproval:', error);
    res.status(500).json({error: 'Error deleting approval'});
  }
};
