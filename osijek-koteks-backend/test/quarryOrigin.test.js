const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeQuarryCode,
  resolveCreatorOriginLocationCode,
  resolveCreatorQuarryCode,
} = require('../utils/quarryOrigin');

test('normalizes a canonical quarry code', () => {
  assert.equal(normalizeQuarryCode('  quarry-17  '), 'QUARRY-17');
  assert.equal(normalizeQuarryCode('   '), null);
  assert.equal(normalizeQuarryCode(undefined), null);
});

test('resolves the canonical quarry code from the creator snapshot source', () => {
  assert.equal(resolveCreatorQuarryCode({ quarryCode: ' 23453 ' }), '23453');
  assert.equal(resolveCreatorQuarryCode({ email: 'unknown@example.com' }), null);
});

test('keeps the legacy email mapping in one place for existing speed locations', () => {
  assert.equal(
    resolveCreatorOriginLocationCode({
      email: ' VELICKI.VAGA@VELICKI-KAMEN.HR ',
      quarryCode: '23453',
    }),
    'VELIČKI KAMEN VELIČANKA'
  );
});

test('uses the canonical quarry code as the speed origin for a newly configured quarry', () => {
  assert.equal(
    resolveCreatorOriginLocationCode({
      email: 'new-quarry-bot@example.com',
      quarryCode: ' quarry-17 ',
    }),
    'QUARRY-17'
  );
});
