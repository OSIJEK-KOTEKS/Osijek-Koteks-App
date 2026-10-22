const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createDeliveryNoteSyncService,
  deliveryStates,
  hasSameIntegrationSnapshot,
  laterThan,
} = require('../services/deliveryNoteSyncService');
const { buildDeliveryNoteEvent } = require('../utils/deliveryNoteEvent');

const SESSION = { id: 'test-transaction' };
const NOW = new Date('2026-08-26T10:00:00.000Z');

function item(overrides = {}) {
  return {
    _id: { toString: () => '68ac3ff2b7f6b982644a77a1' },
    creationDate: new Date('2026-08-24T07:55:00.000Z'),
    updatedAt: new Date('2026-08-24T08:04:58.000Z'),
    quarryCode: '23453',
    code: 'BELI_MANASTIR',
    prijevoznik: 'Slavonija Transport',
    tezina: 24500,
    registracija: 'OS-123-AB',
    pdfUrl: 'https://source.example/delivery-note.pdf',
    approvalStatus: 'na čekanju',
    in_transit: false,
    ...overrides,
  };
}

function stores(initialState = null) {
  let state = initialState;
  const outbox = [];
  const calls = [];

  return {
    calls,
    outbox,
    state: () => state,
    SyncStateModel: {
      async findOne(query, projection, options) {
        calls.push(['findOne', query, projection, options]);
        return state;
      },
      async replaceOne(query, replacement, options) {
        calls.push(['replaceOne', query, replacement, options]);
        state = { ...replacement };
      },
    },
    OutboxModel: {
      async create(documents, options) {
        calls.push(['outboxCreate', documents, options]);
        outbox.push(...documents);
      },
    },
  };
}

test('records the latest snapshot and one independently tracked delivery per target', async () => {
  const fake = stores();
  const service = createDeliveryNoteSyncService({
    ...fake,
    targetNames: ['production', 'staging', 'production'],
    now: () => NOW,
  });

  const result = await service.recordUpsert(item(), { session: SESSION });

  assert.equal(result.changed, true);
  assert.equal(fake.state().eventType, 'UPSERT');
  assert.equal(fake.state().quarryCode, '23453');
  assert.deepEqual(
    fake.outbox[0].deliveries.map(delivery => delivery.target),
    ['PRODUCTION', 'STAGING']
  );
  assert.equal(fake.outbox[0].deliveries[0].attemptCount, 0);
  assert.equal(fake.outbox[0].deliveries[1].deliveredAt, null);
});

test('does not enqueue an event when only the Item database timestamp changed', async () => {
  const existing = buildDeliveryNoteEvent({
    item: item(),
    occurredAt: NOW,
  });
  const fake = stores(existing);
  const service = createDeliveryNoteSyncService({
    ...fake,
    targetNames: ['production'],
    now: () => NOW,
  });

  const result = await service.recordUpsert(
    item({ updatedAt: new Date('2026-08-25T12:00:00.000Z') }),
    { session: SESSION }
  );

  assert.deepEqual(result, { event: null, changed: false });
  assert.equal(fake.outbox.length, 0);
  assert.equal(fake.calls.filter(([name]) => name === 'replaceOne').length, 0);
});

test('persists a later raw Item timestamp when two meaningful changes share a millisecond', async () => {
  const existing = buildDeliveryNoteEvent({ item: item(), occurredAt: NOW });
  const fake = stores(existing);
  const persistedTimes = [];
  const changedItem = item({ code: 'OSIJEK' });
  const service = createDeliveryNoteSyncService({
    ...fake,
    now: () => NOW,
    persistItemUpdatedAt: async args => {
      persistedTimes.push(args.sourceUpdatedAt);
      args.item.updatedAt = args.sourceUpdatedAt;
    },
  });

  const result = await service.recordUpsert(changedItem, { session: SESSION });

  assert.equal(result.changed, true);
  assert.equal(result.event.sourceUpdatedAt.toISOString(), '2026-08-24T08:04:58.001Z');
  assert.equal(persistedTimes[0].toISOString(), '2026-08-24T08:04:58.001Z');
});

test('records a DELETE as a retained latest tombstone', async () => {
  const existing = buildDeliveryNoteEvent({ item: item(), occurredAt: NOW });
  const fake = stores(existing);
  const service = createDeliveryNoteSyncService({
    ...fake,
    targetNames: ['production'],
    now: () => NOW,
  });

  const result = await service.recordDelete(item(), { session: SESSION });

  assert.equal(result.event.eventType, 'DELETE');
  assert.equal(fake.state().eventType, 'DELETE');
  assert.equal(fake.state().sourceUpdatedAt.toISOString(), NOW.toISOString());
  assert.equal(fake.outbox.length, 1);
});

test('compares integration data but ignores event identity and delivery time', () => {
  const first = buildDeliveryNoteEvent({ item: item(), occurredAt: NOW });
  const second = buildDeliveryNoteEvent({
    item: item({ updatedAt: new Date('2026-08-25T00:00:00.000Z') }),
    occurredAt: new Date('2026-08-26T11:00:00.000Z'),
  });

  assert.equal(hasSameIntegrationSnapshot(first, second), true);
  assert.equal(hasSameIntegrationSnapshot(first, { ...second, netWeightKg: 25000 }), false);
});

test('builds clean target states and advances colliding timestamps by one millisecond', () => {
  assert.deepEqual(
    deliveryStates([' production ', '', 'PRODUCTION', 'staging'], NOW).map(state => state.target),
    ['PRODUCTION', 'STAGING']
  );
  assert.equal(
    laterThan(
      new Date('2026-08-24T08:04:58.000Z'),
      new Date('2026-08-24T08:04:58.000Z')
    ).toISOString(),
    '2026-08-24T08:04:58.001Z'
  );
});

test('refuses to write outside a MongoDB transaction', async () => {
  const fake = stores();
  const service = createDeliveryNoteSyncService({ ...fake, now: () => NOW });

  await assert.rejects(() => service.recordUpsert(item(), {}), /transaction session is required/);
  assert.equal(fake.outbox.length, 0);
});
