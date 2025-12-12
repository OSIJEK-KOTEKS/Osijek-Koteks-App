const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url: {
    type: String,
    default: null,
  },
  publicId: {
    type: String,
    default: null,
  },
  uploadDate: {
    type: Date,
    default: null,
  },
  mimeType: {
    type: String,
    default: null,
    enum: [null, 'application/pdf'],
  },
  originalName: {
    type: String,
    default: null,
  },
});

const BillSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    dobavljac: {
      type: String,
      required: true,
      enum: ['KAMEN - PSUNJ d.o.o.', 'MOLARIS d.o.o.', 'VELIČKI KAMEN d.o.o.'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attachment: {
      type: attachmentSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Bill', BillSchema);
