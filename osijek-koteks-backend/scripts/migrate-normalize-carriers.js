/**
 * Carrier-name (prijevoznik) consolidation migration.
 *
 * Finds all distinct `prijevoznik` values on Item documents, groups them by a
 * case/punctuation/whitespace-insensitive key, and rewrites every item in a
 * group to a single canonical variant — the most-frequently-used variant
 * within that group (alphabetical tie-break).
 *
 * Usage (from osijek-koteks-backend/):
 *
 *   node scripts/migrate-normalize-carriers.js              # dry run, prints plan
 *   node scripts/migrate-normalize-carriers.js --apply      # actually update DB
 *   node scripts/migrate-normalize-carriers.js --apply --verbose
 *
 * Reads MONGODB_URI from .env (same as server.js).
 *
 * Safe to re-run: idempotent. After it runs once cleanly there is nothing left
 * to consolidate.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const { normalizeCarrier, carrierKey } = require('../utils/normalizeCarrier');

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

function pickCanonical(variantCounts) {
  // variantCounts: { [variant: string]: count }
  // Pick the variant with the highest count. Tie-break: alphabetically first.
  // We also normalize the chosen variant (trim + collapse whitespace) so even
  // the canonical form gets cleaned up.
  const entries = Object.entries(variantCounts);
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // higher count first
    return a[0].localeCompare(b[0]); // then alphabetical
  });
  return normalizeCarrier(entries[0][0]);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log(`Mode: ${APPLY ? 'APPLY (will modify DB)' : 'DRY RUN (no changes)'}`);
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);

  // Aggregate counts per raw variant — one DB pass.
  const counts = await Item.aggregate([
    { $match: { prijevoznik: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$prijevoznik', count: { $sum: 1 } } },
  ]);

  console.log(`Found ${counts.length} distinct raw prijevoznik values across items.`);

  // Group by carrierKey.
  const groups = new Map(); // key -> { variants: { [variant]: count }, totalDocs: number }
  for (const { _id: variant, count } of counts) {
    const key = carrierKey(variant);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { variants: {}, totalDocs: 0 });
    const group = groups.get(key);
    group.variants[variant] = (group.variants[variant] || 0) + count;
    group.totalDocs += count;
  }

  // Build a plan: only groups with >1 variant, OR a single variant that needs
  // soft normalization (e.g. trailing whitespace).
  const plan = [];
  for (const [key, group] of groups) {
    const variants = Object.keys(group.variants);
    const canonical = pickCanonical(group.variants);
    const variantsNeedingChange = variants.filter(v => v !== canonical);
    if (variantsNeedingChange.length === 0) continue;
    plan.push({
      key,
      canonical,
      totalDocs: group.totalDocs,
      changes: variantsNeedingChange.map(v => ({
        from: v,
        count: group.variants[v],
      })),
    });
  }

  if (plan.length === 0) {
    console.log('Nothing to consolidate. All carrier names are already canonical.');
    await mongoose.disconnect();
    return;
  }

  // Print plan.
  console.log(`\n=== Plan: ${plan.length} group(s) need consolidation ===\n`);
  let totalDocsTouched = 0;
  for (const entry of plan) {
    console.log(`Canonical: "${entry.canonical}"  (key: ${entry.key})`);
    for (const change of entry.changes) {
      console.log(`    "${change.from}"  →  "${entry.canonical}"   (${change.count} docs)`);
      totalDocsTouched += change.count;
    }
    console.log('');
  }
  console.log(`Total documents that will be updated: ${totalDocsTouched}`);

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to perform the updates.');
    await mongoose.disconnect();
    return;
  }

  // Apply.
  console.log('\nApplying updates...');
  let docsUpdated = 0;
  for (const entry of plan) {
    for (const change of entry.changes) {
      // Use updateMany with the literal string to avoid regex edge cases.
      // We bypass the pre-update hook's normalization for the "from" match
      // by using exact equality.
      const result = await Item.updateMany(
        { prijevoznik: change.from },
        { $set: { prijevoznik: entry.canonical } }
      );
      docsUpdated += result.modifiedCount || 0;
      if (VERBOSE) {
        console.log(
          `  matched=${result.matchedCount}  modified=${result.modifiedCount}  ` +
            `"${change.from}" → "${entry.canonical}"`
        );
      }
    }
  }

  console.log(`\nDone. Updated ${docsUpdated} document(s).`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
