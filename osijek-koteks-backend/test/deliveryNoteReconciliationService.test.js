const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EVENT_FIELDS,
  ReconciliationQueryError,
  createDeliveryNoteReconciliationService,
  decodeCursor,
} = require('../services/deliveryNoteReconciliationService');

function state(sourceId, sourceUpdatedAt, eventType = 'UPSERT') {
  return {
    _id: `internal-${sourceId}`,
    eventId: `00000000-0000-4000-8000-${sourceId.padStart(12, '0')}`,
    eventType,
    occurredAt: new Date(sourceUpdatedAt),
    sourceId,
    sourceCreatedAt: new Date('2026-08-20T00:00:00.000Z'),
    sourceUpdatedAt: new Date(sourceUpdatedAt),
    quarryCode: '23453',
    destinationCode: 'OSIJEK',
    carrierName: 'Carrier',
    netWeightKg: 24000,
    vehicleRegistration: null,
    pdfUrl: null,
    approvalStatus: 'odobreno',
    inTransit: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  };
}

function greaterThan(left, right) {
  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;
  return leftValue > rightValue;
}

function matches(document, filter) {
  if (filter.$and) return filter.$and.every(part => matches(document, part));
  if (filter.$or) return filter.$or.some(part => matches(document, part));

  return Object.entries(filter).every(([field, expected]) => {
    const actual = document[field];
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      if (expected.$gt !== undefined) return greaterThan(actual, expected.$gt);
    }
    if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();
    }
    return actual === expected;
  });
}

function model(records) {
  return {
    find(filter) {
      const query = {
        records: records.filter(record => matches(record, filter)),
        sort() {
          this.records.sort(
            (left, right) =>
              left.sourceUpdatedAt - right.sourceUpdatedAt ||
              left.sourceId.localeCompare(right.sourceId)
          );
          return this;
        },
        limit(limit) {
          this.records = this.records.slice(0, limit);
          return this;
        },
        async lean() {
          return this.records;
        },
      };
      return query;
    },
  };
}

test('traverses tied timestamps deterministically without gaps or duplicates', async () => {
  const records = [
    state('b', '2026-08-24T08:00:00.000Z', 'DELETE'),
    state('c', '2026-08-24T09:00:00.000Z'),
    state('a', '2026-08-24T08:00:00.000Z'),
  ];
  const service = createDeliveryNoteReconciliationService({ SyncStateModel: model(records) });

  const firstPage = await service.list({ limit: '2' });
  const secondPage = await service.list({ limit: '2', cursor: firstPage.nextCursor });

  assert.deepEqual(firstPage.records.map(record => record.sourceId), ['a', 'b']);
  assert.equal(firstPage.records[1].eventType, 'DELETE');
  assert.deepEqual(secondPage.records.map(record => record.sourceId), ['c']);
  assert.equal(secondPage.nextCursor, null);
  assert.deepEqual(Object.keys(firstPage.records[0]), [...EVENT_FIELDS]);
  assert.equal(firstPage.records[0]._id, undefined);

  const cursor = decodeCursor(firstPage.nextCursor);
  assert.equal(cursor.sourceUpdatedAt.toISOString(), '2026-08-24T08:00:00.000Z');
  assert.equal(cursor.sourceId, 'b');
});

test('updatedAfter is strictly incremental while an omitted value performs a full traversal', async () => {
  const records = [
    state('a', '2026-08-24T08:00:00.000Z'),
    state('b', '2026-08-24T08:00:00.000Z'),
    state('c', '2026-08-24T09:00:00.000Z', 'DELETE'),
  ];
  const service = createDeliveryNoteReconciliationService({ SyncStateModel: model(records) });

  const full = await service.list();
  const incremental = await service.list({ updatedAfter: '2026-08-24T08:00:00Z' });

  assert.deepEqual(full.records.map(record => record.sourceId), ['a', 'b', 'c']);
  assert.deepEqual(incremental.records.map(record => record.sourceId), ['c']);
  assert.equal(incremental.records[0].eventType, 'DELETE');
});

test('rejects malformed dates, limits, and cursors', async () => {
  const service = createDeliveryNoteReconciliationService({ SyncStateModel: model([]) });

  await assert.rejects(
    () => service.list({ updatedAfter: '24.08.2026.' }),
    ReconciliationQueryError
  );
  await assert.rejects(() => service.list({ limit: '0' }), /between 1 and 500/);
  await assert.rejects(() => service.list({ limit: '501' }), /between 1 and 500/);
  await assert.rejects(() => service.list({ cursor: 'not-a-valid-cursor' }), /cursor is invalid/);
});
