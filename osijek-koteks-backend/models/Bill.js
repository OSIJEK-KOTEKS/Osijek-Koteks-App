const mongoose = require('mongoose');

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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Bill', BillSchema);
