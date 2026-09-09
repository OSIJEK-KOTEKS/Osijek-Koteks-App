const assert = require('node:assert/strict');
const test = require('node:test');

const { createItemBulkMutationService } = require('../services/itemBulkMutationService');

function queryResult(getItems) {
  return {
    sort() {
      return this;
    },
    limit(limit) {
      this.batchSize = limit;
      return this;
    },
    async session() {
      return getItems()
        .sort((a, b) => a._id.localeCompare(b._id))
        .slice(0, this.batchSize);
    },
  };
}

function fixture(documents, matches) {
  const calls = [];
  const ItemModel = {
    find: filter => {
      calls.push(['find', filter]);
      const cursor = filter.$and?.find(condition => condition._id)?._id.$gt;
      return queryResult(() =>
        documents.filter(item => matches(item) && (!cursor || item._id > cursor))
      );
    },
  };
  const itemMutationService = {
    async withTransaction(work) {
      calls.push(['transaction']);
      return work({
        session: { id: 'bulk-session' },
        async saveItem(item) {
          calls.push(['saveItem', item._id]);
        },
        async deleteItem(item) {
          calls.push(['deleteItem', item._id]);
          documents.splice(documents.indexOf(item), 1);
        },
      });
    },
  };

  return { calls, ItemModel, itemMutationService };
}

test('updates matching Items in bounded transactional batches', async () => {
  const documents = [
    { _id: '1', code: 'OLD' },
    { _id: '2', code: 'OLD' },
    { _id: '3', code: 'OLD' },
    { _id: '4', code: 'KEEP' },
  ];
  const testFixture = fixture(documents, item => item.code === 'OLD');
  const service = createItemBulkMutationService({ ...testFixture, batchSize: 2 });

  const count = await service.updateMatchingItems({
    filter: { code: 'OLD' },
    mutateItem: item => {
      item.code = 'NEW';
    },
  });

  assert.equal(count, 3);
  assert.deepEqual(
    documents.map(item => item.code),
    ['NEW', 'NEW', 'NEW', 'KEEP']
  );
  assert.equal(testFixture.calls.filter(([name]) => name === 'saveItem').length, 3);
  assert.equal(testFixture.calls.filter(([name]) => name === 'transaction').length, 3);
});

test('deletes matching Items through tombstone-producing transactions', async () => {
  const documents = [
    { _id: '1', expired: true },
    { _id: '2', expired: false },
    { _id: '3', expired: true },
  ];
  const testFixture = fixture(documents, item => item.expired);
  const service = createItemBulkMutationService({ ...testFixture, batchSize: 1 });

  const count = await service.deleteMatchingItems({ filter: { expired: true } });

  assert.equal(count, 2);
  assert.deepEqual(
    documents.map(item => item._id),
    ['2']
  );
  assert.equal(testFixture.calls.filter(([name]) => name === 'deleteItem').length, 2);
});

test('rejects an unsafe batch size', () => {
  assert.throws(() => createItemBulkMutationService({ batchSize: 0 }), /positive integer/);
});

test('visits each matching Item once even when the mutation leaves it matching', async () => {
  const documents = [
    { _id: '3', code: 'ACME' },
    { _id: '1', code: 'ACME' },
    { _id: '4', code: 'KEEP' },
    { _id: '2', code: 'ACME' },
  ];
  const testFixture = fixture(documents, item => item.code === 'ACME');
  const service = createItemBulkMutationService({ ...testFixture, batchSize: 2 });
  const visited = [];
  const count = await service.updateMatchingItems({
    filter: { code: 'ACME' },
    mutateItem(item) {
      assert.ok(!visited.includes(item._id), 'An Item must not be processed twice');
      visited.push(item._id);
      item.code = 'ACME';
    },
  });
  assert.equal(count, 3);
  assert.deepEqual(visited, ['1', '2', '3']);
});
