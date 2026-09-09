const { DELIVERY_NOTE_EVENT_TYPES, buildDeliveryNoteEvent } = require('../utils/deliveryNoteEvent');

const SNAPSHOT_FIELDS = Object.freeze([
  'eventType',
  'sourceId',
  'sourceCreatedAt',
  'quarryCode',
  'destinationCode',
  'carrierName',
  'netWeightKg',
  'vehicleRegistration',
  'pdfUrl',
  'approvalStatus',
  'inTransit',
]);

function comparableValue(value) {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

function hasSameIntegrationSnapshot(currentState, candidateEvent) {
  if (!currentState) return false;

  return SNAPSHOT_FIELDS.every(
    field => comparableValue(currentState[field]) === comparableValue(candidateEvent[field])
  );
}

function uniqueTargetNames(targetNames) {
  return [
    ...new Set(
      (targetNames || [])
        .filter(target => typeof target === 'string')
        .map(target => target.trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
}

function deliveryStates(targetNames, nextAttemptAt) {
  return uniqueTargetNames(targetNames).map(target => ({
    target,
    attemptCount: 0,
    nextAttemptAt,
    lastError: null,
    deliveredAt: null,
    leaseToken: null,
    leaseUntil: null,
  }));
}

function laterThan(date, minimumExclusive) {
  if (!minimumExclusive || date.getTime() > minimumExclusive.getTime()) return date;
  return new Date(minimumExclusive.getTime() + 1);
}

async function defaultPersistItemUpdatedAt({ item, sourceUpdatedAt, session }) {
  await item.constructor.updateOne(
    { _id: item._id },
    { $set: { updatedAt: sourceUpdatedAt } },
    { session, timestamps: false }
  );
  item.updatedAt = sourceUpdatedAt;
}

function createDeliveryNoteSyncService({
  SyncStateModel,
  OutboxModel,
  targetNames = [],
  now = () => new Date(),
  persistItemUpdatedAt = defaultPersistItemUpdatedAt,
} = {}) {
  const SyncState = SyncStateModel || require('../models/DeliveryNoteSyncState');
  const Outbox = OutboxModel || require('../models/DeliveryNoteOutbox');
  const configuredTargetNames = uniqueTargetNames(targetNames);

  async function recordItem(item, { eventType, session }) {
    if (!session) throw new TypeError('A MongoDB transaction session is required');

    const operationTime = now();
    let sourceUpdatedAt =
      eventType === DELIVERY_NOTE_EVENT_TYPES.DELETE ? operationTime : item.updatedAt;
    let candidateEvent = buildDeliveryNoteEvent({
      item,
      eventType,
      occurredAt: operationTime,
      sourceUpdatedAt,
    });

    const currentState = await SyncState.findOne({ sourceId: candidateEvent.sourceId }, null, {
      session,
    });

    if (hasSameIntegrationSnapshot(currentState, candidateEvent)) {
      return { event: null, changed: false };
    }

    sourceUpdatedAt = laterThan(candidateEvent.sourceUpdatedAt, currentState?.sourceUpdatedAt);
    if (
      eventType === DELIVERY_NOTE_EVENT_TYPES.UPSERT &&
      sourceUpdatedAt.getTime() !== candidateEvent.sourceUpdatedAt.getTime()
    ) {
      await persistItemUpdatedAt({ item, sourceUpdatedAt, session });
    }

    if (sourceUpdatedAt.getTime() !== candidateEvent.sourceUpdatedAt.getTime()) {
      candidateEvent = {
        ...candidateEvent,
        sourceUpdatedAt,
      };
    }

    await SyncState.replaceOne({ sourceId: candidateEvent.sourceId }, candidateEvent, {
      session,
      upsert: true,
      runValidators: true,
    });
    await Outbox.create(
      [
        {
          event: candidateEvent,
          deliveries: deliveryStates(configuredTargetNames, operationTime),
        },
      ],
      { session }
    );

    return { event: candidateEvent, changed: true };
  }

  return {
    recordDelete: (item, options) =>
      recordItem(item, { ...options, eventType: DELIVERY_NOTE_EVENT_TYPES.DELETE }),
    recordUpsert: (item, options) =>
      recordItem(item, { ...options, eventType: DELIVERY_NOTE_EVENT_TYPES.UPSERT }),
  };
}

module.exports = {
  SNAPSHOT_FIELDS,
  createDeliveryNoteSyncService,
  deliveryStates,
  hasSameIntegrationSnapshot,
  laterThan,
  uniqueTargetNames,
};
