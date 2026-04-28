/**
 * Carrier-name (prijevoznik) normalization helpers.
 *
 * Two functions:
 *
 *   - normalizeCarrier(value): the "soft" normalization used on every write.
 *     Trims and collapses internal whitespace. Preserves casing and punctuation
 *     so we don't mangle legitimate brand names (e.g. "MOLARIS" stays uppercase).
 *
 *   - carrierKey(value): the "hard" key used to detect duplicates that differ
 *     only by casing/whitespace/punctuation. Lowercases, strips dots and commas,
 *     collapses whitespace. Two strings with the same key are treated as the
 *     same carrier for migration / case-insensitive query purposes.
 *
 * Examples:
 *   normalizeCarrier("  IKAR   d.o.o.  ")    → "IKAR d.o.o."
 *   carrierKey("IKAR D.O.O.")                → "ikar doo"
 *   carrierKey("IKAR d.o.o.")                → "ikar doo"
 *   carrierKey("ikar  d . o . o.")           → "ikar d o o"  (different — by design)
 */

function normalizeCarrier(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function carrierKey(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { normalizeCarrier, carrierKey };
