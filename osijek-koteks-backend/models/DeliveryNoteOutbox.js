const mongoose = require('mongoose');

const { createDeliveryNoteEventSchema } = require('./schemas/deliveryNoteEventSchema');

const DeliveryStateSchema = new mongoose.Schema(
  {
    target: { type: String, required: true, trim: true, uppercase: true },
    attemptCount: { type: Number, required: true, min: 0, default: 0 },
    nextAttemptAt: { type: Date, required: true, default: Date.now },
    lastError: { type: String, maxlength: 2000, default: null },
    deliveredAt: { type: Date, default: null },
    leaseToken: { type: String, default: null },
    leaseUntil: { type: Date, default: null },
  },
  { _id: false, id: false }
);

const DeliveryNoteOutboxSchema = new mongoose.Schema(
  {
    event: {
      type: createDeliveryNoteEventSchema(),
      required: true,
    },
    deliveries: {
      type: [DeliveryStateSchema],
      default: [],
    },
  },
  { timestamps: true }
);

DeliveryNoteOutboxSchema.index({ 'event.eventId': 1 }, { unique: true });
DeliveryNoteOutboxSchema.index({ 'event.sourceId': 1, createdAt: 1 });
DeliveryNoteOutboxSchema.index({
  'deliveries.target': 1,
  'deliveries.deliveredAt': 1,
  'deliveries.nextAttemptAt': 1,
  'deliveries.leaseUntil': 1,
});

module.exports = mongoose.model('DeliveryNoteOutbox', DeliveryNoteOutboxSchema);
