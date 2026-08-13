/**
 * Prijevoznik unification.
 *
 * Items are created from several locations (weighing scales, web, mobile) and
 * each spells the carrier a little differently — "GARIĆ" vs
 * "GARIĆ PRIJEVOZ I USLUGE". Admins map every stray spelling onto one entry of
 * the unified list (models/CarrierAlias), and from then on every write is
 * rewritten automatically.
 *
 * The alias table is tiny and read on every Item write, so it is cached in
 * memory and refreshed at most once per CACHE_TTL_MS. Route handlers that
 * mutate rules call invalidateAliasCache() so their own change takes effect
 * immediately.
 */

const { carrierKey } = require('./normalizeCarrier');

const CACHE_TTL_MS = 60 * 1000;

let aliasMap = new Map(); // fromKey -> canonical name
let loadedAt = 0;
let inFlight = null;

function getCanonicalSeedList() {
  // Required lazily so a malformed JSON file surfaces at call time, not import time.
  return require('../config/carriers.json');
}

async function refreshAliasCache() {
  // Required here to avoid a circular import (Item -> carrierUnification -> models).
  const CarrierAlias = require('../models/CarrierAlias');

  const aliases = await CarrierAlias.find().select('fromKey to').lean();
  const next = new Map();
  aliases.forEach(a => {
    if (a.fromKey && a.to) next.set(a.fromKey, a.to);
  });

  aliasMap = next;
  loadedAt = Date.now();
  return aliasMap;
}

function invalidateAliasCache() {
  loadedAt = 0;
}

/**
 * Refresh the cache if it is older than the TTL. Concurrent callers share one
 * query. Never throws — a failed refresh keeps serving the previous map so a
 * transient DB hiccup cannot block item creation.
 */
async function ensureAliasCache() {
  if (Date.now() - loadedAt < CACHE_TTL_MS) return aliasMap;

  if (!inFlight) {
    inFlight = refreshAliasCache()
      .catch(err => {
        console.error('Carrier alias cache refresh failed:', err.message);
        return aliasMap;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

/**
 * Map one carrier value through the alias table. Single hop by design: a rule
 * target must be a canonical name, so chains cannot form and a cycle can never
 * loop here.
 */
function applyAliasSync(value) {
  if (typeof value !== 'string' || !value) return value;
  return aliasMap.get(carrierKey(value)) || value;
}

async function applyAlias(value) {
  if (typeof value !== 'string' || !value) return value;
  await ensureAliasCache();
  return applyAliasSync(value);
}

/**
 * Seed the canonical list from config/carriers.json. Idempotent: existing
 * entries keep their spelling, missing ones are inserted. Returns counts.
 */
async function seedCanonicalCarriers(createdBy = null) {
  const CarrierCanonical = require('../models/CarrierCanonical');

  const names = getCanonicalSeedList();
  const ops = names.map(name => ({
    updateOne: {
      filter: { key: carrierKey(name) },
      update: {
        $setOnInsert: {
          name: name.replace(/\s+/g, ' ').trim(),
          key: carrierKey(name),
          ...(createdBy ? { createdBy } : {}),
        },
      },
      upsert: true,
    },
  }));

  if (ops.length === 0) return { inserted: 0, total: 0 };

  const result = await CarrierCanonical.bulkWrite(ops, { ordered: false });
  const total = await CarrierCanonical.countDocuments();
  return { inserted: result.upsertedCount || 0, total };
}

/**
 * Called once after the DB connection opens: fills the alias cache and makes
 * sure the canonical list exists on a fresh database.
 */
async function initCarrierUnification() {
  try {
    const CarrierCanonical = require('../models/CarrierCanonical');
    const existing = await CarrierCanonical.countDocuments();
    if (existing === 0) {
      const { inserted } = await seedCanonicalCarriers();
      console.log(`Seeded ${inserted} canonical carriers from config/carriers.json`);
    }
    await refreshAliasCache();
    console.log(`Carrier alias rules loaded: ${aliasMap.size}`);
  } catch (err) {
    console.error('Carrier unification init failed:', err.message);
  }
}

module.exports = {
  applyAlias,
  applyAliasSync,
  ensureAliasCache,
  refreshAliasCache,
  invalidateAliasCache,
  seedCanonicalCarriers,
  initCarrierUnification,
  getCanonicalSeedList,
};
