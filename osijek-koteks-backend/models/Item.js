// Item.js (MongoDB Schema) - Complete file with user filter support and FIXED date formatting
const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
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
  publicId: {
    type: String,
    default: null,
  },
});

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
          return v && v.trim().length > 0;
        },
        message: 'Code cannot be empty',
      },
    },
    // ADD: createdBy field for user filtering
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Make it required for new items
    },
    neto: {
      type: Number,
      required: false,
    },
    // Add tezina field
    tezina: {
      type: Number,
      required: false,
    },
    // Add prijevoznik field
    prijevoznik: {
      type: String,
      required: false,
      trim: true,
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
    registracija: {
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
    // Added new field for in transit status
    in_transit: {
      type: Boolean,
      default: false,
    },
    // Updated to have two photos
    approvalPhotoFront: photoSchema,
    approvalPhotoBack: photoSchema,
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
    approvalDocument: {
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
        enum: [null, 'application/pdf'],
      },
      publicId: {
        type: String,
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
ItemSchema.index({prijevoznik: 1});
ItemSchema.index({createdBy: 1}); // ADD: Index for user filtering

// REMOVED: The problematic toJSON method that was causing inconsistent date formatting
// This was the root cause of the MM/DD/YYYY vs DD/MM/YYYY issue
/*
ItemSchema.methods.toJSON = function () {
  const obj = this.toObject();

  if (obj.creationDate) {
    obj.creationDate = obj.creationDate.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zagreb',
    });
  }

  if (!obj.creationTime && obj.createdAt) {
    obj.creationTime = obj.createdAt.toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });
  }

  if (obj.approvalDate) {
    // Format as "DD.MM.YYYY HH:MM"
    obj.approvalDate = obj.approvalDate.toLocaleString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });
  }

  return obj;
};
*/

// OPTIONAL: Add virtual fields for formatted dates (if needed for specific use cases)
// These won't be included in JSON responses by default, but can be accessed when needed
ItemSchema.virtual('formattedCreationDate').get(function () {
  if (!this.creationDate) return null;
  return this.creationDate.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Zagreb',
  });
});

ItemSchema.virtual('formattedApprovalDate').get(function () {
  if (!this.approvalDate) return null;
  return this.approvalDate.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zagreb',
  });
});

ItemSchema.virtual('formattedCreationTime').get(function () {
  if (this.creationTime) return this.creationTime;
  if (!this.createdAt) return null;
  return this.createdAt.toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zagreb',
  });
});

// Ensure virtual fields are NOT included in JSON by default
// This prevents breaking changes and lets frontend handle formatting
ItemSchema.set('toJSON', {virtuals: false});

module.exports = mongoose.model('Item', ItemSchema);
