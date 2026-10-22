/**
 * Removes items whose weight is under one tonne — loads too light to be real
 * deliveries (mostly 0 kg rows the scale produced).
 *
 * Two groups are deliberately left alone, because deleting them would destroy
 * evidence or break a link rather than clean up noise:
 *
 *   - approved items (`odobreno`), which carry the approver, their photos and
 *     the GPS fix taken at approval
 *   - items linked to a TransportAcceptance, whose slot accounting references
 *     them
 *
 * Deletion goes through the same mutation service the DELETE route uses, so
 * every removal records a DELETE tombstone for the delivery-note targets in
 * the same transaction. Deleting these rows with a bare deleteMany() would
 * leave every downstream system believing the items still exist.
 *
 * Usage (from osijek-koteks-backend/):
 *
 *   node scripts/remove-underweight-items.js                # dry run, prints plan
 *   node scripts/remove-underweight-items.js --apply        # actually delete
 *   node scripts/remove-underweight-items.js --apply --limit=50
 *   node scripts/remove-underweight-items.js --verbose
 *
 * Reads MONGODB_URI and the DELIVERY_NOTE_TARGET_* vars from .env, the same as
 * server.js. Run it where those targets are configured the way production has
 * them — see the warning the script prints when none are enabled.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const cloudinary = require('../config/cloudinary');
const { createItemMutationService } = require('../services/itemMutationService');
const { enabledTargetNames, loadDeliveryNoteTargets } = require('../config/deliveryNoteTargets');

// Anything lighter than this is not a real load. Weight is stored in kg.
const UNDER_KG = 1000;

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

// A missing tezina means "unknown", not "light", so those items are untouched.
const TOO_LIGHT = {
  tezina: { $exists: true, $ne: null, $lt: UNDER_KG },
  approvalStatus: { $ne: 'odobreno' },
  $or: [{ transportAcceptanceId: null }, { transportAcceptanceId: { $exists: false } }],
};

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  const targets = enabledTargetNames(loadDeliveryNoteTargets());
  if (targets.length === 0) {
    console.warn(
      'WARNING: no delivery-note targets are enabled in this environment.\n' +
        '         Deletions will still record sync state, but nothing will be\n' +
        '         queued for delivery to PRODUCTION/STAGING. If those targets are\n' +
        '         enabled in production, run this there instead.\n'
    );
  } else {
    console.log(`Delivery-note targets enabled: ${targets.join(', ')}`);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const itemMutations = createItemMutationService();
  console.log(`Connected. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  const total = await Item.countDocuments(TOO_LIGHT);

  const query = Item.find(TOO_LIGHT)
    .select(
      '_id title tezina neto approvalStatus approvalPhotoFront approvalPhotoBack approvalDocument'
    )
    .sort({ creationDate: -1 });
  if (LIMIT > 0) query.limit(LIMIT);

  const items = await query;

  if (items.length < total) {
    console.log(
      `${total} item(s) under ${UNDER_KG} kg; this run takes the newest ${items.length}.\n`
    );
  } else {
    console.log(`${total} item(s) under ${UNDER_KG} kg.\n`);
  }

  let removed = 0;
  const failures = [];

  for (const item of items) {
    const label = `${String(item.tezina).padStart(6)} kg  ${(
      item.title || item._id.toString()
    ).substring(0, 50)}`;

    if (!APPLY) {
      console.log(`  would delete  ${label}`);
      removed += 1;
      continue;
    }

    try {
      const result = await itemMutations.withTransaction(async ({ session, deleteItem }) => {
        // Re-read inside the transaction: an item approved since the query
        // above must not be deleted.
        const fresh = await Item.findById(item._id).session(session);
        if (!fresh) return { skipped: 'already gone' };
        if (fresh.approvalStatus === 'odobreno') return { skipped: 'approved meanwhile' };
        if (fresh.transportAcceptanceId) return { skipped: 'linked meanwhile' };

        const filesToDelete = [
          fresh.approvalPhotoFront?.publicId,
          fresh.approvalPhotoBack?.publicId,
          fresh.approvalDocument?.publicId,
        ].filter(Boolean);

        await deleteItem(fresh);
        return { filesToDelete };
      });

      if (result.skipped) {
        failures.push({ id: item._id, label, reason: result.skipped });
        if (VERBOSE) console.log(`  skipped       ${label} — ${result.skipped}`);
        continue;
      }

      // Only once the item and its tombstone have committed.
      for (const publicId of result.filesToDelete) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('  failed to delete Cloudinary file:', publicId, err?.message);
        }
      }

      console.log(`  deleted       ${label}`);
      removed += 1;
    } catch (err) {
      failures.push({ id: item._id, label, reason: err?.message || 'delete failed' });
      if (VERBOSE) console.log(`  FAILED        ${label} — ${err?.message}`);
    }
  }

  console.log(
    `\nDone. ${APPLY ? 'Deleted' : 'Would delete'} ${removed} of the ${
      items.length
    } item(s) tried` + `${items.length < total ? `; ${total - items.length} still to go` : ''}.`
  );

  if (failures.length > 0) {
    console.log(`\n${failures.length} item(s) skipped or failed:`);
    for (const failure of failures) {
      console.log(`  ${failure.id}  ${failure.label}  — ${failure.reason}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Removal failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
