const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  title: {type: String, required: true},
  code: {type: String, required: true},
  pdfUrl: {type: String, required: true},
});

module.exports = mongoose.model('Item', ItemSchema);
