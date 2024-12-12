const approvalPhotoSchema = new Schema({
  url: String,
  uploadDate: Date,
  mimeType: String,
  publicId: String, // Add this field
});
