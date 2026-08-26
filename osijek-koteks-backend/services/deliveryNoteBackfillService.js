const { buildDeliveryNoteEvent } = require('../utils/deliveryNoteEvent');
const { normalizeQuarryCode, resolveCreatorQuarryCode } = require('../utils/quarryOrigin');
const { hasSameIntegrationSnapshot } = require('./deliveryNoteSyncService');
const { createItemMutationService } = require('./itemMutationService');

function analyzeBackfillItem({ item, creator, currentState }) {
  const existingQuarryCode = normalizeQuarryCode(item.quarryCode);
  const creatorQuarryCode = resolveCreatorQuarryCode(creator);
  const resolvedQuarryCode = existingQuarryCode || creatorQuarryCode;
  const candidateItem = {
    _id: item._id,
    creationDate: item.creationDate,
    updatedAt: item.updatedAt,
    quarryCode: resolvedQuarryCode,
    code: item.code,
    prijevoznik: item.prijevoznik,
    tezina: item.tezina,
    neto: item.neto,
    registracija: item.registracija,
    pdfUrl: item.pdfUrl,
    approvalStatus: item.approvalStatus,
    in_transit: item.in_transit,
  };
  const candidateEvent = buildDeliveryNoteEvent({ item: candidateItem });

  return {
    candidateEvent,
    creatorId: item.createdBy?.toString() || null,
    needsQuarryCode: !existingQuarryCode,
    needsSync: !hasSameIntegrationSnapshot(currentState, candidateEvent),
    resolvedQuarryCode,
  };
}

function createDeliveryNoteBackfillService({
  ItemModel,
  UserModel,
  SyncStateModel,
  itemMutationService,
  batchSize = 100,
} = {}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError('batchSize must be a positive integer');
  }

  const Item = ItemModel || require('../models/Item');
  const User = UserModel || require('../models/User');
  const SyncState = SyncStateModel || require('../models/DeliveryNoteSyncState');
  const itemMutations = itemMutationService || createItemMutationService();

  async function loadPage(afterId) {
    const filter = afterId ? { _id: { $gt: afterId } } : {};
    return Item.find(filter).sort({ _id: 1 }).limit(batchSize).lean();
  }

  async function analyze(item) {
    const [creator, currentState] = await Promise.all([
      User.findById(item.createdBy).select('quarryCode').lean(),
      SyncState.findOne({ sourceId: item._id.toString() }).lean(),
    ]);
    return analyzeBackfillItem({ item, creator, currentState });
  }

  async function applyItem(itemId) {
    return itemMutations.withTransaction(async ({ session, saveItem }) => {
      const item = await Item.findById(itemId).session(session);
      if (!item) return { applied: false, reason: 'missing-item' };

      const [creator, currentState] = await Promise.all([
        User.findById(item.createdBy).select('quarryCode').session(session),
        SyncState.findOne({ sourceId: item._id.toString() }, null, { session }),
      ]);
      const analysis = analyzeBackfillItem({ item, creator, currentState });
      if (!analysis.needsQuarryCode && !analysis.needsSync) {
        return { applied: false, reason: 'already-current' };
      }

      if (analysis.needsQuarryCode && analysis.resolvedQuarryCode) {
        item.quarryCode = analysis.resolvedQuarryCode;
      }
      await saveItem(item);

      return {
        applied: true,
        quarryCodeFilled: analysis.needsQuarryCode && Boolean(analysis.resolvedQuarryCode),
      };
    });
  }

  async function run({ apply = false, onProgress = () => {} } = {}) {
    const result = {
      scanned: 0,
      missingQuarryCode: 0,
      resolvableQuarryCode: 0,
      unresolvedQuarryCode: 0,
      syncChangesNeeded: 0,
      applied: 0,
      quarryCodesFilled: 0,
      unresolvedCreatorIds: new Set(),
    };
    let afterId = null;

    while (true) {
      const items = await loadPage(afterId);
      if (items.length === 0) break;

      for (const item of items) {
        const analysis = await analyze(item);
        result.scanned += 1;
        if (analysis.needsQuarryCode) {
          result.missingQuarryCode += 1;
          if (analysis.resolvedQuarryCode) {
            result.resolvableQuarryCode += 1;
          } else {
            result.unresolvedQuarryCode += 1;
            if (analysis.creatorId) result.unresolvedCreatorIds.add(analysis.creatorId);
          }
        }
        if (analysis.needsSync) result.syncChangesNeeded += 1;

        if (apply && (analysis.needsQuarryCode || analysis.needsSync)) {
          const appliedResult = await applyItem(item._id);
          if (appliedResult.applied) result.applied += 1;
          if (appliedResult.quarryCodeFilled) result.quarryCodesFilled += 1;
        }
      }

      afterId = items.at(-1)._id;
      onProgress({ scanned: result.scanned });
    }

    return {
      ...result,
      unresolvedCreatorIds: [...result.unresolvedCreatorIds].sort(),
    };
  }

  return { run };
}

module.exports = {
  analyzeBackfillItem,
  createDeliveryNoteBackfillService,
};
