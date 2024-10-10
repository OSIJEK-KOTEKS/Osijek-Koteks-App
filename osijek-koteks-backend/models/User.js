const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  company: {type: String, required: true},
  phoneNumber: {type: String, required: true, unique: true},
  code: {type: String, required: true},
  role: {type: String, enum: ['admin', 'user', 'bot'], default: 'user'},
  isVerified: {type: Boolean, default: false},
});

module.exports = mongoose.model('User', UserSchema);
