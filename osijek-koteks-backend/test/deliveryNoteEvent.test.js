const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DELIVERY_NOTE_EVENT_TYPES,
  UNRESOLVED_INTEGRATION_VALUE,
  buildDeliveryNoteEvent,
  integrationWeight,
} = require('../utils/deliveryNoteEvent');

function item(overrides = {}) {
  return {
    _id: { toString: () => '68ac3ff2b7f6b982644a77a1' },
    creationDate: new Date('2026-08-24T07:55:00.123Z'),
    updatedAt: new Date('2026-08-24T08:04:58.456Z'),
    quarryCode: ' vk-01 ',
    code: ' BELI_MANASTIR ',
    prijevoznik: '  Slavonija   Transport ',
    tezina: 24500.1254,
    neto: 7.5,
    registracija: ' OS-123-AB ',
    pdfUrl: ' https://source.example/delivery-note.pdf ',
    approvalStatus: 'na čekanju',
    in_transit: true,
    ...overrides,
  };
}

test('builds the contract DTO from raw Item values', () => {
  const event = buildDeliveryNoteEvent({
    item: item(),
    eventId: '9d7ba94e-ce87-4ba4-b6b8-1225070c6c6d',
    occurredAt: new Date('2026-08-24T08:05:00.789Z'),
  });

  assert.deepEqual(JSON.parse(JSON.stringify(event)), {
    eventId: '9d7ba94e-ce87-4ba4-b6b8-1225070c6c6d',
    eventType: 'UPSERT',
    occurredAt: '2026-08-24T08:05:00.789Z',
    sourceId: '68ac3ff2b7f6b982644a77a1',
    sourceCreatedAt: '2026-08-24T07:55:00.123Z',
    sourceUpdatedAt: '2026-08-24T08:04:58.456Z',
    quarryCode: 'VK-01',
    destinationCode: 'BELI_MANASTIR',
    carrierName: 'Slavonija Transport',
    netWeightKg: 24500.125,
    vehicleRegistration: 'OS-123-AB',
    pdfUrl: 'https://source.example/delivery-note.pdf',
    approvalStatus: 'na čekanju',
    inTransit: true,
  });
});

test('uses raw dates without calling the locale-formatted Item toJSON method', () => {
  let toJsonCalled = false;
  const source = item({
    toJSON: () => {
      toJsonCalled = true;
      return { creationDate: '24.08.2026.' };
    },
  });

  const event = buildDeliveryNoteEvent({ item: source });

  assert.equal(toJsonCalled, false);
  assert.equal(event.sourceCreatedAt.toISOString(), '2026-08-24T07:55:00.123Z');
});

test('uses tezina as the delivery weight and falls back to neto', () => {
  assert.equal(integrationWeight(item({ tezina: 24500, neto: 10 })), 24500);
  assert.equal(integrationWeight(item({ tezina: null, neto: 18750 })), 18750);
  assert.equal(integrationWeight(item({ tezina: undefined, neto: undefined })), null);
});

test('uses an explicit unresolved value instead of guessing quarry or carrier names', () => {
  const event = buildDeliveryNoteEvent({
    item: item({ quarryCode: undefined, prijevoznik: '   ' }),
  });

  assert.equal(event.quarryCode, UNRESOLVED_INTEGRATION_VALUE);
  assert.equal(event.carrierName, UNRESOLVED_INTEGRATION_VALUE);
});

test('creates DELETE tombstones with the latest supplied source update time', () => {
  const deletionTime = new Date('2026-08-25T12:30:00.000Z');
  const event = buildDeliveryNoteEvent({
    item: item(),
    eventType: DELIVERY_NOTE_EVENT_TYPES.DELETE,
    sourceUpdatedAt: deletionTime,
  });

  assert.equal(event.eventType, 'DELETE');
  assert.equal(event.sourceUpdatedAt.toISOString(), deletionTime.toISOString());
  assert.equal(event.destinationCode, 'BELI_MANASTIR');
});

test('rejects invalid dates and weights before they can enter the outbox', () => {
  assert.throws(
    () => buildDeliveryNoteEvent({ item: item({ updatedAt: 'not-a-date' }) }),
    /sourceUpdatedAt must be a valid date/
  );
  assert.throws(() => integrationWeight(item({ tezina: -1 })), /nonnegative number/);
});
