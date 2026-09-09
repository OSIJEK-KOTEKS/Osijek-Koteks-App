const { randomUUID } = require('node:crypto');

const { normalizeCarrier } = require('./normalizeCarrier');
const { normalizeQuarryCode } = require('./quarryOrigin');

const DELIVERY_NOTE_EVENT_TYPES = Object.freeze({
  UPSERT: 'UPSERT',
  DELETE: 'DELETE',
});
const UNRESOLVED_INTEGRATION_VALUE = 'UNRESOLVED';

function requiredDate(value, fieldName) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${fieldName} must be a valid date`);
  }
  return date;
}

function optionalText(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function integrationWeight(item) {
  const value = item.tezina ?? item.neto;
  if (value === undefined || value === null || value === '') return null;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new TypeError('Delivery-note weight must be a nonnegative number');
  }

  return Math.round((numericValue + Number.EPSILON) * 1000) / 1000;
}

function buildDeliveryNoteEvent({
  item,
  eventType = DELIVERY_NOTE_EVENT_TYPES.UPSERT,
  eventId = randomUUID(),
  occurredAt = new Date(),
  sourceUpdatedAt = item?.updatedAt,
}) {
  if (!item) throw new TypeError('item is required');
  if (!Object.values(DELIVERY_NOTE_EVENT_TYPES).includes(eventType)) {
    throw new TypeError(`Unsupported delivery-note event type: ${eventType}`);
  }

  const sourceId = item._id?.toString().trim();
  const destinationCode = optionalText(item.code);
  const approvalStatus = optionalText(item.approvalStatus);
  if (!sourceId) throw new TypeError('Item ID is required');
  if (!destinationCode) throw new TypeError('Item destination code is required');
  if (!approvalStatus) throw new TypeError('Item approval status is required');

  return {
    eventId,
    eventType,
    occurredAt: requiredDate(occurredAt, 'occurredAt'),
    sourceId,
    sourceCreatedAt: requiredDate(item.creationDate, 'sourceCreatedAt'),
    sourceUpdatedAt: requiredDate(sourceUpdatedAt, 'sourceUpdatedAt'),
    quarryCode: normalizeQuarryCode(item.quarryCode) || UNRESOLVED_INTEGRATION_VALUE,
    destinationCode,
    carrierName: normalizeCarrier(item.prijevoznik) || UNRESOLVED_INTEGRATION_VALUE,
    netWeightKg: integrationWeight(item),
    vehicleRegistration: optionalText(item.registracija),
    pdfUrl: optionalText(item.pdfUrl),
    approvalStatus,
    inTransit: Boolean(item.in_transit),
  };
}

module.exports = {
  DELIVERY_NOTE_EVENT_TYPES,
  UNRESOLVED_INTEGRATION_VALUE,
  buildDeliveryNoteEvent,
  integrationWeight,
};
