const mongoose = require('mongoose');

const TransportAcceptanceSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRequest',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    registrations: {
      type: [String],
      required: true,
      validate: {
        validator: function (registrations) {
          return registrations.length > 0;
        },
        message: 'At least one registration is required',
      },
    },
    acceptedCount: {
      type: Number,
      required: true,
      min: 1,
    },
    gradiliste: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['Nije plaćeno', 'Plaćeno'],
      default: 'Nije plaćeno',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
TransportAcceptanceSchema.index({ requestId: 1, status: 1 });
TransportAcceptanceSchema.index({ userId: 1 });

module.exports = mongoose.model('TransportAcceptance', TransportAcceptanceSchema);
