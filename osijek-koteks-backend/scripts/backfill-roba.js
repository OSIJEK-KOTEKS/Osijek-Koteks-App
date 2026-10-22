/**
 * Backfill the `roba` / `robaSifra` fields on items created before the item
 * create route started reading them off the scale ticket PDF.
 *
 * Walks every non-asfalt item that has no `roba` yet, downloads its ticket and
 * parses the "Roba:" block out of it. Items whose PDF cannot be fetched or
 * recognised are left untouched and reported at the end, so the script can
 * simply be run again later.
 *
 * Usage (from osijek-koteks-backend/):
 *
 *   node scripts/backfill-roba.js                     # dry run, prints plan
 *   node scripts/backfill-roba.js --apply             # actually update DB
 *   node scripts/backfill-roba.js --apply --limit=50  # work through in batches
 *   node scripts/backfill-roba.js --apply --verbose
 *
 * Reads MONGODB_URI from .env (same as server.js).
 *
 * Safe to re-run: idempotent, and only ever fills fields that are still empty.
 * Downloads run one at a time on purpose — this talks to Google Drive, and a
 * burst of parallel requests is the quickest way to start getting throttled.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const { parseRobaFromPdfUrl } = require('../utils/parseRoba');

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  const query = Item.find({
    isAsfalt: { $ne: true },
    pdfUrl: { $exists: true, $ne: '' },
    $or: [{ roba: null }, { roba: { $exists: false } }],
  })
    .select('_id title pdfUrl')
    .sort({ creationDate: -1 });

  if (LIMIT > 0) query.limit(LIMIT);

  const items = await query;
  console.log(`${items.length} item(s) without roba.\n`);

  let filled = 0;
  const failures = [];

  for (const item of items) {
    const label = (item.title || item._id.toString()).substring(0, 60);

    let parsed;
    try {
      parsed = await parseRobaFromPdfUrl(item.pdfUrl);
    } catch (err) {
      failures.push({ id: item._id, title: label, reason: err?.message || 'download failed' });
      if (VERBOSE) console.log(`  ✗ ${label} — ${err?.message}`);
      continue;
    }

    if (!parsed.roba) {
      failures.push({ id: item._id, title: label, reason: 'no "Roba:" block found' });
      if (VERBOSE) console.log(`  ✗ ${label} — no "Roba:" block found`);
      continue;
    }

    console.log(
      `  ✓ ${label}\n      → ${parsed.roba}${
        parsed.robaSifra ? ` (šifra ${parsed.robaSifra})` : ''
      }`
    );

    if (APPLY) {
      await Item.updateOne(
        { _id: item._id },
        { $set: { roba: parsed.roba, robaSifra: parsed.robaSifra } }
      );
    }
    filled += 1;
  }

  console.log(
    `\nDone. ${APPLY ? 'Updated' : 'Would update'} ${filled} of ${items.length} item(s).`
  );

  if (failures.length > 0) {
    console.log(`\n${failures.length} item(s) could not be read (re-run later to retry):`);
    for (const failure of failures) {
      console.log(`  ${failure.id}  ${failure.title}  — ${failure.reason}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Backfill failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
