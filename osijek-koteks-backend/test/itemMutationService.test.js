const assert = require('node:assert/strict');
const test = require('node:test');

const { createItemMutationService } = require('../services/itemMutationService');

function fixture({ transactionError } = {}) {
  const session = { id: 'session-1' };
  const calls = [];
  const connection = {
    async transaction(work, options) {
      calls.push(['transaction', options]);
      if (transactionError) throw transactionError;
      return work(session);
    },
  };
  const syncService = {
    async recordUpsert(item, options) {
      calls.push(['recordUpsert', item, options]);
    },
    async recordDelete(item, options) {
      calls.push(['recordDelete', item, options]);
    },
  };
  const item = {
    async save(options) {
      calls.push(['save', options]);
      return this;
    },
    async deleteOne(options) {
      calls.push(['deleteOne', options]);
    },
  };

  return { calls, connection, item, session, syncService };
}

test('saves an Item and records its event in the same transaction session', async () => {
  const testFixture = fixture();
  const service = createItemMutationService(testFixture);

  const result = await service.withTransaction(async ({ saveItem }) => saveItem(testFixture.item));

  assert.equal(result, testFixture.item);
  assert.deepEqual(
    testFixture.calls.map(([name]) => name),
    ['transaction', 'save', 'recordUpsert']
  );
  assert.equal(testFixture.calls[1][1].session, testFixture.session);
  assert.equal(testFixture.calls[2][2].session, testFixture.session);
});

test('records a DELETE tombstone before deleting the Item in the same transaction', async () => {
  const testFixture = fixture();
  const service = createItemMutationService(testFixture);

  await service.withTransaction(async ({ deleteItem }) => deleteItem(testFixture.item));

  assert.deepEqual(
    testFixture.calls.map(([name]) => name),
    ['transaction', 'recordDelete', 'deleteOne']
  );
  assert.equal(testFixture.calls[1][2].session, testFixture.session);
  assert.equal(testFixture.calls[2][1].session, testFixture.session);
});

test('does not run Item work when the transaction cannot start', async () => {
  const transactionError = new Error('transaction unavailable');
  const testFixture = fixture({ transactionError });
  const service = createItemMutationService(testFixture);
  let workCalled = false;

  await assert.rejects(
    () =>
      service.withTransaction(async () => {
        workCalled = true;
      }),
    transactionError
  );
  assert.equal(workCalled, false);
});
