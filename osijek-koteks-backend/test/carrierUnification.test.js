const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const { carrierKey, normalizeCarrier } = require('../utils/normalizeCarrier');

// Stub the CarrierAlias model before carrierUnification requires it, so the
// alias cache can be filled without a database.
const aliasModelPath = require.resolve('../models/CarrierAlias');
let stubbedAliases = [];
require.cache[aliasModelPath] = {
  id: aliasModelPath,
  filename: aliasModelPath,
  loaded: true,
  exports: {
    find: () => ({
      select: () => ({
        lean: async () => stubbedAliases,
      }),
    }),
  },
};

const {
  applyAlias,
  applyAliasSync,
  refreshAliasCache,
  invalidateAliasCache,
  getCanonicalSeedList,
} = require('../utils/carrierUnification');

async function loadRules(rules) {
  stubbedAliases = rules.map(([from, to]) => ({ fromKey: carrierKey(from), to }));
  invalidateAliasCache();
  await refreshAliasCache();
}

test('canonical seed list is non-empty and free of duplicate keys', () => {
  const names = getCanonicalSeedList();
  assert.ok(Array.isArray(names));
  assert.ok(names.length > 100, `expected the full carrier list, got ${names.length}`);

  const keys = new Set();
  names.forEach(name => {
    assert.equal(typeof name, 'string');
    assert.equal(name, name.trim(), `"${name}" has surrounding whitespace`);
    const key = carrierKey(name);
    assert.ok(!keys.has(key), `duplicate carrier key for "${name}"`);
    keys.add(key);
  });

  assert.ok(names.includes('GARIĆ PRIJEVOZ I USLUGE'));
});

test('rewrites a mapped carrier to its canonical name', async () => {
  await loadRules([['GARIĆ', 'GARIĆ PRIJEVOZ I USLUGE']]);
  assert.equal(await applyAlias('GARIĆ'), 'GARIĆ PRIJEVOZ I USLUGE');
});

test('matching ignores case, punctuation and stray whitespace', async () => {
  await loadRules([['IKAR DOO', 'IKAR d.o.o.']]);

  for (const variant of ['ikar d.o.o.', 'IKAR D.O.O.', '  Ikar   doo  ', 'Ikar, DOO']) {
    const value = normalizeCarrier(variant);
    assert.equal(await applyAlias(value), 'IKAR d.o.o.', `variant "${variant}" was not mapped`);
  }
});

test('leaves unmapped carriers untouched', async () => {
  await loadRules([['GARIĆ', 'GARIĆ PRIJEVOZ I USLUGE']]);
  assert.equal(await applyAlias('NEPOZNATI PRIJEVOZNIK'), 'NEPOZNATI PRIJEVOZNIK');
  assert.equal(await applyAlias('STRABAG d.o.o.'), 'STRABAG d.o.o.');
});

test('mapping is single-hop, so a chain cannot cascade', async () => {
  // A -> B and B -> C. Applying to A must stop at B, never reach C.
  await loadRules([
    ['A PRIJEVOZ', 'B PRIJEVOZ'],
    ['B PRIJEVOZ', 'C PRIJEVOZ'],
  ]);
  assert.equal(await applyAlias('A PRIJEVOZ'), 'B PRIJEVOZ');
});

test('a two-rule cycle terminates instead of looping', async () => {
  await loadRules([
    ['X PRIJEVOZ', 'Y PRIJEVOZ'],
    ['Y PRIJEVOZ', 'X PRIJEVOZ'],
  ]);
  assert.equal(await applyAlias('X PRIJEVOZ'), 'Y PRIJEVOZ');
  assert.equal(await applyAlias('Y PRIJEVOZ'), 'X PRIJEVOZ');
});

test('empty and non-string values pass through unchanged', async () => {
  await loadRules([['GARIĆ', 'GARIĆ PRIJEVOZ I USLUGE']]);
  assert.equal(await applyAlias(''), '');
  assert.equal(await applyAlias(undefined), undefined);
  assert.equal(await applyAlias(null), null);
});

test('the sync form uses the already-loaded cache', async () => {
  await loadRules([['GARIĆ', 'GARIĆ PRIJEVOZ I USLUGE']]);
  assert.equal(applyAliasSync('garić'), 'GARIĆ PRIJEVOZ I USLUGE');
});

test('deleting a rule stops future rewrites once the cache reloads', async () => {
  await loadRules([['GARIĆ', 'GARIĆ PRIJEVOZ I USLUGE']]);
  assert.equal(await applyAlias('GARIĆ'), 'GARIĆ PRIJEVOZ I USLUGE');

  await loadRules([]);
  assert.equal(await applyAlias('GARIĆ'), 'GARIĆ');
});

test('a failed cache refresh keeps serving the previous rules', async t => {
  await loadRules([['GARIĆ', 'GARIĆ PRIJEVOZ I USLUGE']]);

  const CarrierAlias = require(path.relative(__dirname, aliasModelPath).replace(/\\/g, '/'));
  const originalFind = CarrierAlias.find;
  CarrierAlias.find = () => ({
    select: () => ({
      lean: async () => {
        throw new Error('db down');
      },
    }),
  });
  t.after(() => {
    CarrierAlias.find = originalFind;
  });

  invalidateAliasCache();
  assert.equal(await applyAlias('GARIĆ'), 'GARIĆ PRIJEVOZ I USLUGE');
});
