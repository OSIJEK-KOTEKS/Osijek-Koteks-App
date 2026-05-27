/**
 * Merge two RN codes into one.
 *
 * Rewrites every Item whose `code` equals <fromCode> so its code becomes
 * <toCode>, then tidies the now-orphaned lookups for <fromCode>:
 *   - CodeMapping(<fromCode>) is removed (the surviving <toCode> keeps its own
 *     name — from its own CodeMapping or the static codeMapping.ts fallback).
 *   - CodeLocation(<fromCode>) is moved to <toCode> if <toCode> has none,
 *     otherwise removed (the `code` field is unique, so it can't be duplicated).
 *
 * Codes are matched by EXACT string equality, so whitespace variants like
 * "25053 - A" and "25053 -A" are treated as the distinct values they are.
 *
 * Usage (from osijek-koteks-backend/):
 *
 *   node scripts/merge-codes.js "<fromCode>" "<toCode>"            # dry run
 *   node scripts/merge-codes.js "<fromCode>" "<toCode>" --apply    # modify DB
 *
 * Example (merge "25053 - A" into "25053 -A"):
 *
 *   node scripts/merge-codes.js "25053 - A" "25053 -A"
 *   node scripts/merge-codes.js "25053 - A" "25053 -A" --apply
 *
 * Reads MONGODB_URI from .env (same as server.js).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const CodeMapping = require('../models/CodeMapping');
const CodeLocation = require('../models/CodeLocation');

const APPLY = process.argv.includes('--apply');
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [FROM, TO] = positional;

async function main() {
  if (!FROM || !TO) {
    console.error('Usage: node scripts/merge-codes.js "<fromCode>" "<toCode>" [--apply]');
    process.exit(1);
  }
  if (FROM === TO) {
    console.error('fromCode and toCode are identical — nothing to merge.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log(`Mode: ${APPLY ? 'APPLY (will modify DB)' : 'DRY RUN (no changes)'}`);
  console.log(`Merging items:  "${FROM}"  →  "${TO}"`);
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);

  const [fromItemCount, toItemCount] = await Promise.all([
    Item.countDocuments({ code: FROM }),
    Item.countDocuments({ code: TO }),
  ]);

  const [fromMapping, toMapping, fromLocation, toLocation] = await Promise.all([
    CodeMapping.findOne({ code: FROM }),
    CodeMapping.findOne({ code: TO }),
    CodeLocation.findOne({ code: FROM }),
    CodeLocation.findOne({ code: TO }),
  ]);

  console.log('\n=== Plan ===');
  console.log(`Items "${FROM}": ${fromItemCount}   →  will be recoded to "${TO}"`);
  console.log(`Items "${TO}":   ${toItemCount}   (unchanged; total after merge: ${fromItemCount + toItemCount})`);

  console.log(
    `CodeMapping "${FROM}": ${fromMapping ? `exists ("${fromMapping.name}") — will be DELETED` : 'none'}`
  );
  console.log(
    `CodeMapping "${TO}":   ${toMapping ? `exists ("${toMapping.name}") — kept` : 'none (name comes from static codeMapping.ts if present)'}`
  );

  if (fromLocation) {
    if (toLocation) {
      console.log(`CodeLocation "${FROM}": exists — will be DELETED ("${TO}" already has a location)`);
    } else {
      console.log(`CodeLocation "${FROM}": exists — will be MOVED to "${TO}"`);
    }
  } else {
    console.log(`CodeLocation "${FROM}": none`);
  }

  if (fromItemCount === 0 && !fromMapping && !fromLocation) {
    console.log(`\nNothing references "${FROM}". Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to perform the merge.');
    await mongoose.disconnect();
    return;
  }

  console.log('\nApplying...');

  const itemResult = await Item.updateMany({ code: FROM }, { $set: { code: TO } });
  console.log(`Items recoded: matched=${itemResult.matchedCount} modified=${itemResult.modifiedCount}`);

  if (fromLocation) {
    if (toLocation) {
      await CodeLocation.deleteOne({ _id: fromLocation._id });
      console.log(`CodeLocation "${FROM}" deleted.`);
    } else {
      fromLocation.code = TO;
      await fromLocation.save();
      console.log(`CodeLocation moved "${FROM}" → "${TO}".`);
    }
  }

  if (fromMapping) {
    await CodeMapping.deleteOne({ _id: fromMapping._id });
    console.log(`CodeMapping "${FROM}" deleted.`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Merge failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
