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
    //  Updated to have two photos
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
    obj.approvalDate = obj.approvalDate.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return obj;
};

module.exports = mongoose.model('Item', ItemSchema);
