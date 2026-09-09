const mongoose = require('mongoose');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deliveryNoteEventDefinition() {
  return {
    eventId: {
      type: String,
      required: true,
      match: UUID_PATTERN,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['UPSERT', 'DELETE'],
    },
    occurredAt: { type: Date, required: true },
    sourceId: { type: String, required: true, trim: true },
    sourceCreatedAt: { type: Date, required: true },
    sourceUpdatedAt: { type: Date, required: true },
    quarryCode: { type: String, required: true, trim: true },
    destinationCode: { type: String, required: true, trim: true },
    carrierName: { type: String, required: true, trim: true },
    netWeightKg: { type: Number, min: 0, default: null },
    vehicleRegistration: { type: String, trim: true, default: null },
    pdfUrl: { type: String, trim: true, default: null },
    approvalStatus: { type: String, required: true, trim: true },
    inTransit: { type: Boolean, required: true },
  };
}

function createDeliveryNoteEventSchema() {
  return new mongoose.Schema(deliveryNoteEventDefinition(), {
    _id: false,
    id: false,
  });
}

module.exports = {
  createDeliveryNoteEventSchema,
  deliveryNoteEventDefinition,
};
