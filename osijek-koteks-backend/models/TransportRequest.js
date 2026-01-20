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
    isplataPoT: {
      type: Number,
      required: true,
      min: 0,
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
    assignedTo: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function(value) {
          // Must be either the string "All" or an array of ObjectIds
          if (value === 'All') return true;
          if (Array.isArray(value)) {
            return value.length > 0 && value.every(id => mongoose.Types.ObjectId.isValid(id));
          }
          return false;
        },
        message: 'assignedTo must be either "All" or an array of valid user IDs'
      }
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TransportRequest', TransportRequestSchema);
