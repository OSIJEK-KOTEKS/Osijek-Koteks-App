const { enabledTargetNames, loadDeliveryNoteTargets } = require('../config/deliveryNoteTargets');
const { createDeliveryNoteSyncService } = require('./deliveryNoteSyncService');

const TRANSACTION_OPTIONS = Object.freeze({
  readPreference: 'primary',
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
});

function createItemMutationService({ connection, syncService } = {}) {
  const databaseConnection = connection || require('mongoose').connection;
  const deliveryNoteSync =
    syncService ||
    createDeliveryNoteSyncService({
      targetNames: enabledTargetNames(loadDeliveryNoteTargets()),
    });

  async function withTransaction(work) {
    let result;

    await databaseConnection.transaction(async session => {
      const context = {
        session,
        async saveItem(item) {
          const savedItem = await item.save({ session });
          await deliveryNoteSync.recordUpsert(savedItem, { session });
          return savedItem;
        },
        async deleteItem(item) {
          await deliveryNoteSync.recordDelete(item, { session });
          await item.deleteOne({ session });
        },
      };

      result = await work(context);
    }, TRANSACTION_OPTIONS);

    return result;
  }

  return { withTransaction };
}

module.exports = {
  TRANSACTION_OPTIONS,
  createItemMutationService,
};
