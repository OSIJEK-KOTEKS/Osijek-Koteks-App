const mongoose = require('mongoose');
const { carrierKey } = require('../utils/normalizeCarrier');

/**
 * A unification rule: every Item whose prijevoznik matches `fromKey` gets its
 * prijevoznik rewritten to `to`.
 *
 * Example: { from: "GARIĆ", to: "GARIĆ PRIJEVOZ I USLUGE" }
 *
 * Matching is done on `fromKey` (case/punctuation-insensitive) so a single rule
 * catches "GARIĆ", "Garić" and "garic" — the kind of drift the different upload
 * locations produce. Rules are applied on every Item write (see models/Item.js)
 * and retroactively to existing items when the rule is created.
 */
const carrierAliasSchema = new mongoose.Schema(
  {
    // Original spelling as first seen / entered, kept for display.
    from: {
      type: String,
      required: true,
      trim: true,
    },
    fromKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Canonical name from the unified list.
    to: {
      type: String,
      required: true,
      trim: true,
    },
    toKey: {
      type: String,
      required: true,
      index: true,
    },
    // How many items the last apply-run rewrote (informational).
    itemsUpdated: {
      type: Number,
      default: 0,
    },
    lastAppliedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

carrierAliasSchema.pre('validate', function (next) {
  if (this.from) this.fromKey = carrierKey(this.from);
  if (this.to) this.toKey = carrierKey(this.to);
  next();
});

module.exports = mongoose.model('CarrierAlias', carrierAliasSchema);
