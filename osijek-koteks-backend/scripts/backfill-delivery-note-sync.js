/**
 * Builds Item quarry snapshots and delivery-note reconciliation state.
 *
 * Dry-run is the default:
 *   node scripts/backfill-delivery-note-sync.js
 *
 * Apply only after old-backend bot users have their canonical quarryCode:
 *   node scripts/backfill-delivery-note-sync.js --apply
 *
 * Production apply additionally requires an explicit acknowledgement:
 *   node scripts/backfill-delivery-note-sync.js --apply --allow-production
 */

require('dotenv').config();
const mongoose = require('mongoose');

const {
  createDeliveryNoteBackfillService,
} = require('../services/deliveryNoteBackfillService');

const APPLY = process.argv.includes('--apply');
const ALLOW_PRODUCTION = process.argv.includes('--allow-production');

function printResult(result) {
  console.log('\n=== Delivery-note backfill report ===');
  console.log(`Items scanned: ${result.scanned}`);
  console.log(`Items missing quarryCode: ${result.missingQuarryCode}`);
  console.log(`Missing quarryCode values resolvable from bot users: ${result.resolvableQuarryCode}`);
  console.log(`Missing quarryCode values still unresolved: ${result.unresolvedQuarryCode}`);
  console.log(`Items needing a new integration snapshot: ${result.syncChangesNeeded}`);
  if (APPLY) {
    console.log(`Items processed: ${result.applied}`);
    console.log(`Item quarryCode values filled: ${result.quarryCodesFilled}`);
  }
  if (result.unresolvedCreatorIds.length > 0) {
    console.log(`Creator IDs needing an old-backend quarryCode: ${result.unresolvedCreatorIds.join(', ')}`);
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Aborting.');
  }
  if (APPLY && process.env.NODE_ENV === 'production' && !ALLOW_PRODUCTION) {
    throw new Error(
      'Production apply is blocked. Review a dry run, then pass --allow-production explicitly.'
    );
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const service = createDeliveryNoteBackfillService();
    const result = await service.run({
      apply: APPLY,
      onProgress: ({ scanned }) => {
        if (scanned % 1000 === 0) console.log(`Scanned ${scanned} Items...`);
      },
    });
    printResult(result);
    if (!APPLY) {
      console.log('\nNo data was changed. Re-run with --apply only after reviewing this report.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Delivery-note backfill failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { main, printResult };
