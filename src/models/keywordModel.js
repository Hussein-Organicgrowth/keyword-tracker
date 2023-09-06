const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KeywordSchema = new Schema({
  keyword: String,
  rank: Number,
  lastChecked: Date,
});

module.exports = KeywordSchema;