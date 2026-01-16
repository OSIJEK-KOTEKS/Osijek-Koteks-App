const mongoose = require('mongoose');

const TransportRequestSchema = new mongoose.Schema(
  {
    kamenolom: {
      type: String,
      required: true,
      enum: ['VELIČKI KAMEN', 'KAMEN - PSUNJ', 'MOLARIS', 'PRODORINA'],
    },
    gradiliste: {
      type: String,
      required: true,
    },
    brojKamiona: {
      type: Number,
      required: true,
      min: 1,
      max: 999,
    },
    prijevozNaDan: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TransportRequest', TransportRequestSchema);
