const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{5}$/.test(v);
        },
        message: 'Code must be exactly 5 digits',
      },
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    creationDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    creationTime: {
      type: String,
      required: false,
    },
    approvalStatus: {
      type: String,
      enum: ['na čekanju', 'odobreno', 'odbijen'],
      default: 'na čekanju',
      required: true,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalPhoto: {
      url: {
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
        enum: [null, 'image/jpeg', 'image/png', 'image/heic'],
      },
    },
    approvalLocation: {
      coordinates: {
        latitude: {
          type: Number,
          default: null,
        },
        longitude: {
          type: Number,
          default: null,
        },
      },
      accuracy: {
        type: Number,
        default: null,
      },
      timestamp: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes for better query performance
ItemSchema.index({code: 1});
ItemSchema.index({approvalStatus: 1});
ItemSchema.index({creationDate: -1});

// Method to format dates for response
ItemSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Format creationDate
  if (obj.creationDate) {
    obj.creationDate = obj.creationDate.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zagreb',
    });
  }

  // Add creationTime if it doesn't exist
  if (!obj.creationTime && obj.createdAt) {
    obj.creationTime = obj.createdAt.toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });
  }
  // Format approvalDate
  if (obj.approvalDate) {
    obj.approvalDate = obj.approvalDate.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Format photo upload date if exists
  if (obj.approvalPhoto && obj.approvalPhoto.uploadDate) {
    obj.approvalPhoto.uploadDate =
      obj.approvalPhoto.uploadDate.toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  }

  return obj;
};

// Pre-save middleware to enforce approval photo requirement
ItemSchema.pre('save', function (next) {
  if (this.approvalStatus === 'odobreno' && !this.isNew) {
    // Check if this is an update to 'approved' status
    if (this.isModified('approvalStatus')) {
      if (!this.approvalPhoto.url) {
        const err = new Error(
          'Approval photo is required when approving an item',
        );
        return next(err);
      }
      if (
        !this.approvalLocation.coordinates.latitude ||
        !this.approvalLocation.coordinates.longitude
      ) {
        const err = new Error('Location is required when approving an item');
        return next(err);
      }
    }
  }
  next();
});

module.exports = mongoose.model('Item', ItemSchema);
