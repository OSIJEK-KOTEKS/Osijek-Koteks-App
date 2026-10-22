const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 500;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

const EVENT_FIELDS = Object.freeze([
  'eventId',
  'eventType',
  'occurredAt',
  'sourceId',
  'sourceCreatedAt',
  'sourceUpdatedAt',
  'quarryCode',
  'destinationCode',
  'carrierName',
  'netWeightKg',
  'vehicleRegistration',
  'pdfUrl',
  'approvalStatus',
  'inTransit',
]);

class ReconciliationQueryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReconciliationQueryError';
  }
}

function parseInstant(value, fieldName) {
  if (typeof value !== 'string' || !ISO_INSTANT_PATTERN.test(value)) {
    throw new ReconciliationQueryError(`${fieldName} must be an ISO-8601 instant`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ReconciliationQueryError(`${fieldName} must be an ISO-8601 instant`);
  }
  return date;
}

function parseLimit(value) {
  if (value === undefined) return DEFAULT_PAGE_LIMIT;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ReconciliationQueryError('limit must be an integer');
  }
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw new ReconciliationQueryError(`limit must be between 1 and ${MAX_PAGE_LIMIT}`);
  }
  return limit;
}

function encodeCursor({ sourceUpdatedAt, sourceId }) {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      sourceUpdatedAt: sourceUpdatedAt.toISOString(),
      sourceId,
    })
  ).toString('base64url');
}

function decodeCursor(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    throw new ReconciliationQueryError('cursor is invalid');
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (
      parsed?.version !== 1 ||
      typeof parsed.sourceId !== 'string' ||
      parsed.sourceId.trim() === ''
    ) {
      throw new Error('invalid cursor contents');
    }
    return {
      sourceUpdatedAt: parseInstant(parsed.sourceUpdatedAt, 'cursor timestamp'),
      sourceId: parsed.sourceId,
    };
  } catch (error) {
    if (error instanceof ReconciliationQueryError) throw error;
    throw new ReconciliationQueryError('cursor is invalid');
  }
}

function reconciliationFilter({ updatedAfter, cursor }) {
  const clauses = [];
  if (updatedAfter) clauses.push({ sourceUpdatedAt: { $gt: updatedAfter } });
  if (cursor) {
    clauses.push({
      $or: [
        { sourceUpdatedAt: { $gt: cursor.sourceUpdatedAt } },
        {
          sourceUpdatedAt: cursor.sourceUpdatedAt,
          sourceId: { $gt: cursor.sourceId },
        },
      ],
    });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

function eventRecord(state) {
  return Object.fromEntries(EVENT_FIELDS.map(field => [field, state[field] ?? null]));
}

function createDeliveryNoteReconciliationService({ SyncStateModel } = {}) {
  const SyncState = SyncStateModel || require('../models/DeliveryNoteSyncState');

  async function list({ updatedAfter: rawUpdatedAfter, cursor: rawCursor, limit: rawLimit } = {}) {
    const updatedAfter =
      rawUpdatedAfter === undefined ? null : parseInstant(rawUpdatedAfter, 'updatedAfter');
    const cursor = rawCursor === undefined ? null : decodeCursor(rawCursor);
    const limit = parseLimit(rawLimit);
    const states = await SyncState.find(reconciliationFilter({ updatedAfter, cursor }))
      .sort({ sourceUpdatedAt: 1, sourceId: 1 })
      .limit(limit + 1)
      .lean();
    const hasNextPage = states.length > limit;
    const page = states.slice(0, limit);
    const lastState = page.at(-1);

    return {
      records: page.map(eventRecord),
      nextCursor:
        hasNextPage && lastState
          ? encodeCursor({
              sourceUpdatedAt: lastState.sourceUpdatedAt,
              sourceId: lastState.sourceId,
            })
          : null,
    };
  }

  return { list };
}

module.exports = {
  DEFAULT_PAGE_LIMIT,
  EVENT_FIELDS,
  MAX_PAGE_LIMIT,
  ReconciliationQueryError,
  createDeliveryNoteReconciliationService,
  decodeCursor,
  encodeCursor,
  eventRecord,
  parseInstant,
  parseLimit,
  reconciliationFilter,
};
