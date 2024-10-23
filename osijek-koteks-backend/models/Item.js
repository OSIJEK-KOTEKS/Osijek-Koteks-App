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
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
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

  return obj;
};

module.exports = mongoose.model('Item', ItemSchema);
