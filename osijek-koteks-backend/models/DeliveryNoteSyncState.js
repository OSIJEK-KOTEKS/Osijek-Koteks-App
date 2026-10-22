const mongoose = require('mongoose');

const { deliveryNoteEventDefinition } = require('./schemas/deliveryNoteEventSchema');

const DeliveryNoteSyncStateSchema = new mongoose.Schema(deliveryNoteEventDefinition(), {
  timestamps: true,
});

DeliveryNoteSyncStateSchema.index({ sourceId: 1 }, { unique: true });
DeliveryNoteSyncStateSchema.index({ sourceUpdatedAt: 1, sourceId: 1 });

module.exports = mongoose.model('DeliveryNoteSyncState', DeliveryNoteSyncStateSchema);
