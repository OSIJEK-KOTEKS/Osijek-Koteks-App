const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const CarrierAlias = require('../models/CarrierAlias');
const CarrierCanonical = require('../models/CarrierCanonical');
const auth = require('../middleware/auth');
const { carrierKey, normalizeCarrier } = require('../utils/normalizeCarrier');
const {
  invalidateAliasCache,
  refreshAliasCache,
  seedCanonicalCarriers,
} = require('../utils/carrierUnification');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin access required.' });
  }
  next();
};

/**
 * Rewrite every item whose prijevoznik matches `fromKey` to `to`.
 * Case/punctuation variants of the same name are all caught in one pass.
 */
async function applyRuleToItems(fromKey, to) {
  const allValues = await Item.distinct('prijevoznik', {
    prijevoznik: { $exists: true, $nin: [null, ''] },
  });

  const variants = allValues.filter(v => typeof v === 'string' && carrierKey(v) === fromKey);
  if (variants.length === 0) return 0;

  const result = await Item.updateMany(
    { prijevoznik: { $in: variants } },
    { $set: { prijevoznik: to } }
  );

  return result.modifiedCount || 0;
}

// ─── Canonical list (the unified names from the scales' Excel list) ───────────

// GET the unified carrier list — any authenticated user (used for dropdowns)
router.get('/canonical', auth, async (req, res) => {
  try {
    const list = await CarrierCanonical.find().sort({ name: 1 }).lean();
    res.json(list);
  } catch (error) {
    console.error('Error fetching canonical carriers:', error);
    res.status(500).json({ message: 'Server error while fetching canonical carriers' });
  }
});

// POST add a name to the unified list (admin only)
router.post('/canonical', auth, adminOnly, async (req, res) => {
  try {
    const name = normalizeCarrier(req.body.name);
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const key = carrierKey(name);
    const existing = await CarrierCanonical.findOne({ key });
    if (existing) {
      return res.status(409).json({ message: `"${existing.name}" već postoji na listi.` });
    }

    const created = await CarrierCanonical.create({ name, key, createdBy: req.user._id });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating canonical carrier:', error);
    res.status(500).json({ message: 'Server error while creating canonical carrier' });
  }
});

// DELETE a name from the unified list (admin only)
router.delete('/canonical/:id', auth, adminOnly, async (req, res) => {
  try {
    const entry = await CarrierCanonical.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Canonical carrier not found' });
    }

    const rulesUsingIt = await CarrierAlias.countDocuments({ toKey: entry.key });
    if (rulesUsingIt > 0) {
      return res.status(409).json({
        message: `Ne mogu obrisati "${entry.name}" — koristi ga ${rulesUsingIt} pravil${
          rulesUsingIt === 1 ? 'o' : 'a'
        } unifikacije.`,
      });
    }

    await entry.deleteOne();
    res.json({ message: 'Canonical carrier deleted' });
  } catch (error) {
    console.error('Error deleting canonical carrier:', error);
    res.status(500).json({ message: 'Server error while deleting canonical carrier' });
  }
});

// POST re-seed the unified list from config/carriers.json (admin only)
router.post('/canonical/seed', auth, adminOnly, async (req, res) => {
  try {
    const result = await seedCanonicalCarriers(req.user._id);
    res.json({ message: 'Seed complete', ...result });
  } catch (error) {
    console.error('Error seeding canonical carriers:', error);
    res.status(500).json({ message: 'Server error while seeding canonical carriers' });
  }
});

// ─── Current carrier values found on items ───────────────────────────────────

/**
 * GET every distinct prijevoznik currently present on items, grouped by its
 * case-insensitive key, with an item count and a status:
 *   'canonical' — already a unified name, nothing to do
 *   'mapped'    — a rule exists (items left over means the rule needs re-applying)
 *   'unmapped'  — needs an admin decision
 */
router.get('/pending', auth, adminOnly, async (req, res) => {
  try {
    const [grouped, canonicals, aliases] = await Promise.all([
      Item.aggregate([
        { $match: { prijevoznik: { $exists: true, $nin: [null, ''] } } },
        {
          $group: {
            _id: '$prijevoznik',
            count: { $sum: 1 },
            lastSeen: { $max: '$creationDate' },
          },
        },
      ]),
      CarrierCanonical.find().select('key name').lean(),
      CarrierAlias.find().select('fromKey to').lean(),
    ]);

    const canonicalByKey = new Map(canonicals.map(c => [c.key, c.name]));
    const aliasByKey = new Map(aliases.map(a => [a.fromKey, a.to]));

    // Collapse spellings that differ only by case/punctuation into one row.
    const rows = new Map();
    grouped.forEach(g => {
      const value = g._id;
      if (typeof value !== 'string' || !value.trim()) return;

      const key = carrierKey(value);
      const existing = rows.get(key);

      if (existing) {
        existing.count += g.count;
        existing.variants.push({ value, count: g.count });
        // Show the spelling that appears most often.
        if (g.count > existing.topCount) {
          existing.value = value;
          existing.topCount = g.count;
        }
        if (g.lastSeen && (!existing.lastSeen || g.lastSeen > existing.lastSeen)) {
          existing.lastSeen = g.lastSeen;
        }
        return;
      }

      rows.set(key, {
        key,
        value,
        topCount: g.count,
        count: g.count,
        lastSeen: g.lastSeen || null,
        variants: [{ value, count: g.count }],
      });
    });

    const result = Array.from(rows.values()).map(row => {
      const { topCount, ...rest } = row;
      const canonicalName = canonicalByKey.get(row.key);
      return {
        ...rest,
        variants: row.variants.sort((a, b) => b.count - a.count),
        status: canonicalName ? 'canonical' : aliasByKey.has(row.key) ? 'mapped' : 'unmapped',
        canonicalName: canonicalName || null,
        mappedTo: aliasByKey.get(row.key) || null,
      };
    });

    // Most-used first — the biggest cleanup wins float to the top.
    result.sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (error) {
    console.error('Error fetching pending carriers:', error);
    res.status(500).json({ message: 'Server error while fetching pending carriers' });
  }
});

// ─── Unification rules ───────────────────────────────────────────────────────

// GET all rules (admin only)
router.get('/aliases', auth, adminOnly, async (req, res) => {
  try {
    const aliases = await CarrierAlias.find().sort({ from: 1 }).lean();
    res.json(aliases);
  } catch (error) {
    console.error('Error fetching carrier aliases:', error);
    res.status(500).json({ message: 'Server error while fetching carrier aliases' });
  }
});

/**
 * POST create a rule and (by default) rewrite all existing items at once.
 * Body: { from, to, apply = true }
 */
router.post('/aliases', auth, adminOnly, async (req, res) => {
  try {
    const from = normalizeCarrier(req.body.from);
    const to = normalizeCarrier(req.body.to);
    const apply = req.body.apply !== false;

    if (!from) return res.status(400).json({ message: 'Polje "from" je obavezno.' });
    if (!to) return res.status(400).json({ message: 'Polje "to" je obavezno.' });

    const fromKey = carrierKey(from);
    const toKey = carrierKey(to);

    if (fromKey === toKey) {
      return res.status(400).json({ message: 'Izvor i odredište su isti naziv.' });
    }

    // The target must be on the unified list, otherwise we'd just be creating
    // another variant — and rules could chain.
    const canonical = await CarrierCanonical.findOne({ key: toKey });
    if (!canonical) {
      return res.status(400).json({
        message: `"${to}" nije na unificiranoj listi prijevoznika.`,
      });
    }

    // A canonical name must never become a rule source, or applying rules could
    // walk a chain / cycle.
    const sourceIsCanonical = await CarrierCanonical.findOne({ key: fromKey });
    if (sourceIsCanonical) {
      return res.status(400).json({
        message: `"${sourceIsCanonical.name}" je već unificirani naziv i ne može se preusmjeriti.`,
      });
    }

    const existing = await CarrierAlias.findOne({ fromKey });
    if (existing && existing.toKey !== toKey) {
      return res.status(409).json({
        message: `Pravilo za "${existing.from}" već postoji (→ ${existing.to}).`,
      });
    }

    const rule =
      existing ||
      new CarrierAlias({ from, to: canonical.name, fromKey, toKey, createdBy: req.user._id });

    rule.to = canonical.name;
    rule.toKey = canonical.key;
    rule.updatedBy = req.user._id;
    await rule.save();

    // Make the rule live before rewriting, so items created mid-migration land
    // on the canonical name too.
    invalidateAliasCache();
    await refreshAliasCache();

    let itemsUpdated = 0;
    if (apply) {
      itemsUpdated = await applyRuleToItems(fromKey, canonical.name);
      rule.itemsUpdated = itemsUpdated;
      rule.lastAppliedAt = new Date();
      await rule.save();
    }

    res.status(existing ? 200 : 201).json({ rule: rule.toObject(), itemsUpdated });
  } catch (error) {
    console.error('Error creating carrier alias:', error);
    res.status(500).json({ message: 'Server error while creating carrier alias' });
  }
});

// PUT change a rule's target (admin only). Body: { to, apply = true }
router.put('/aliases/:id', auth, adminOnly, async (req, res) => {
  try {
    const to = normalizeCarrier(req.body.to);
    const apply = req.body.apply !== false;

    if (!to) return res.status(400).json({ message: 'Polje "to" je obavezno.' });

    const rule = await CarrierAlias.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Pravilo nije pronađeno.' });

    const toKey = carrierKey(to);
    if (toKey === rule.fromKey) {
      return res.status(400).json({ message: 'Izvor i odredište su isti naziv.' });
    }

    const canonical = await CarrierCanonical.findOne({ key: toKey });
    if (!canonical) {
      return res.status(400).json({ message: `"${to}" nije na unificiranoj listi prijevoznika.` });
    }

    rule.to = canonical.name;
    rule.toKey = canonical.key;
    rule.updatedBy = req.user._id;
    await rule.save();

    invalidateAliasCache();
    await refreshAliasCache();

    let itemsUpdated = 0;
    if (apply) {
      itemsUpdated = await applyRuleToItems(rule.fromKey, canonical.name);
      rule.itemsUpdated = itemsUpdated;
      rule.lastAppliedAt = new Date();
      await rule.save();
    }

    res.json({ rule: rule.toObject(), itemsUpdated });
  } catch (error) {
    console.error('Error updating carrier alias:', error);
    res.status(500).json({ message: 'Server error while updating carrier alias' });
  }
});

// POST re-run a rule against existing items (admin only)
router.post('/aliases/:id/apply', auth, adminOnly, async (req, res) => {
  try {
    const rule = await CarrierAlias.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Pravilo nije pronađeno.' });

    const itemsUpdated = await applyRuleToItems(rule.fromKey, rule.to);
    rule.itemsUpdated = itemsUpdated;
    rule.lastAppliedAt = new Date();
    await rule.save();

    res.json({ rule: rule.toObject(), itemsUpdated });
  } catch (error) {
    console.error('Error applying carrier alias:', error);
    res.status(500).json({ message: 'Server error while applying carrier alias' });
  }
});

/**
 * DELETE a rule (admin only). Only stops future rewrites — items already
 * renamed keep their canonical name.
 */
router.delete('/aliases/:id', auth, adminOnly, async (req, res) => {
  try {
    const rule = await CarrierAlias.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Pravilo nije pronađeno.' });

    invalidateAliasCache();
    await refreshAliasCache();

    res.json({ message: 'Pravilo obrisano.' });
  } catch (error) {
    console.error('Error deleting carrier alias:', error);
    res.status(500).json({ message: 'Server error while deleting carrier alias' });
  }
});

module.exports = router;
