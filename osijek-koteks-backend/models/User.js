const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  company: {type: String, required: true},
  codes: {
    type: [String],
    validate: {
      validator: function (codes) {
        if (codes.length === 0) return true;
        return codes.every(code => code && code.trim().length > 0);
      },
      message: 'Each code must be a non-empty string',
    },
    default: [],
  },
  role: {type: String, enum: ['admin', 'user', 'bot'], default: 'user'},
  isVerified: {type: Boolean, default: false},
  phoneNumber: {type: String},
  hasFullAccess: {type: Boolean, default: false},
});

// Hash the password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
