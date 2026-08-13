const mongoose = require('mongoose');
const { carrierKey } = require('../utils/normalizeCarrier');

/**
 * The unified ("canonical") list of Prijevoznik names — the same list that is
 * imported into every weighing scale. Seeded from config/carriers.json on
 * startup, and extendable by admins from the Unifikacija page.
 *
 * `key` is the case/punctuation-insensitive form used for lookups so that
 * "GARIĆ d.o.o." and "Garić D.O.O." are recognised as the same entry.
 */
const carrierCanonicalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

carrierCanonicalSchema.pre('validate', function (next) {
  if (this.name) this.key = carrierKey(this.name);
  next();
});

module.exports = mongoose.model('CarrierCanonical', carrierCanonicalSchema);
