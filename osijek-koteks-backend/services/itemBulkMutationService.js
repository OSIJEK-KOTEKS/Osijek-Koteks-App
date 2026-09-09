const { createItemMutationService } = require('./itemMutationService');

function createItemBulkMutationService({ ItemModel, itemMutationService, batchSize = 100 } = {}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError('batchSize must be a positive integer');
  }

  const Item = ItemModel || require('../models/Item');
  const itemMutations = itemMutationService || createItemMutationService();

  async function loadBatch(filter, session) {
    return Item.find(filter).sort({ _id: 1 }).limit(batchSize).session(session);
  }

  async function updateMatchingItems({ filter, mutateItem }) {
    if (typeof mutateItem !== 'function') throw new TypeError('mutateItem is required');

    let processedCount = 0;
    let lastId;
    while (true) {
      const batch = await itemMutations.withTransaction(async ({ session, saveItem }) => {
        const batchFilter =
          lastId === undefined ? filter : { $and: [filter, { _id: { $gt: lastId } }] };
        const items = await loadBatch(batchFilter, session);
        for (const item of items) {
          await mutateItem(item);
          await saveItem(item);
        }
        return { count: items.length, lastId: items.at(-1)?._id };
      });

      if (batch.count === 0) return processedCount;
      // Advance only after commit so transaction retries process the same batch.
      lastId = batch.lastId;
      processedCount += batch.count;
    }
  }

  async function deleteMatchingItems({ filter }) {
    let processedCount = 0;
    while (true) {
      const batchCount = await itemMutations.withTransaction(async ({ session, deleteItem }) => {
        const items = await loadBatch(filter, session);
        for (const item of items) {
          await deleteItem(item);
        }
        return items.length;
      });

      if (batchCount === 0) return processedCount;
      processedCount += batchCount;
    }
  }

  return {
    deleteMatchingItems,
    updateMatchingItems,
  };
}

module.exports = { createItemBulkMutationService };
