const assert = require('node:assert/strict');
const test = require('node:test');

const { analyzeBackfillItem } = require('../services/deliveryNoteBackfillService');
const { buildDeliveryNoteEvent } = require('../utils/deliveryNoteEvent');

function item(overrides = {}) {
  return {
    _id: { toString: () => '68ac3ff2b7f6b982644a77a1' },
    createdBy: { toString: () => '507f1f77bcf86cd799439011' },
    creationDate: new Date('2026-08-24T07:55:00.000Z'),
    updatedAt: new Date('2026-08-24T08:04:58.000Z'),
    code: 'BELI_MANASTIR',
    prijevoznik: 'Slavonija Transport',
    tezina: 24500,
    pdfUrl: 'https://source.example/note.pdf',
    approvalStatus: 'na čekanju',
    in_transit: false,
    ...overrides,
  };
}

test('plans a missing Item quarry snapshot from its old-backend bot user', () => {
  const analysis = analyzeBackfillItem({
    item: item(),
    creator: { quarryCode: ' 23453 ' },
    currentState: null,
  });

  assert.equal(analysis.needsQuarryCode, true);
  assert.equal(analysis.resolvedQuarryCode, '23453');
  assert.equal(analysis.candidateEvent.quarryCode, '23453');
  assert.equal(analysis.needsSync, true);
});

test('reports an unresolved creator without guessing from its email', () => {
  const analysis = analyzeBackfillItem({
    item: item(),
    creator: { email: 'velicki.vaga@velicki-kamen.hr' },
    currentState: null,
  });

  assert.equal(analysis.resolvedQuarryCode, null);
  assert.equal(analysis.candidateEvent.quarryCode, 'UNRESOLVED');
  assert.equal(analysis.creatorId, '507f1f77bcf86cd799439011');
});

test('is idempotent when the Item snapshot and reconciliation state are current', () => {
  const currentItem = item({ quarryCode: '23453' });
  const currentState = buildDeliveryNoteEvent({ item: currentItem });
  const analysis = analyzeBackfillItem({
    item: currentItem,
    creator: { quarryCode: 'DIFFERENT-LATER-ASSIGNMENT' },
    currentState,
  });

  assert.equal(analysis.needsQuarryCode, false);
  assert.equal(analysis.resolvedQuarryCode, '23453');
  assert.equal(analysis.needsSync, false);
});

test('never overwrites an existing historical Item quarry snapshot', () => {
  const analysis = analyzeBackfillItem({
    item: item({ quarryCode: 'OLD-QUARRY' }),
    creator: { quarryCode: 'NEW-QUARRY' },
    currentState: null,
  });

  assert.equal(analysis.resolvedQuarryCode, 'OLD-QUARRY');
  assert.equal(analysis.candidateEvent.quarryCode, 'OLD-QUARRY');
});
