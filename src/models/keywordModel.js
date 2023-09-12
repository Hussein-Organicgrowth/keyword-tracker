const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlacementSchema = new Schema({
  date: Date,
  rank: Number,
  url: String,
});

const KeywordSchema = new Schema({
  keyword: String,
  category: String,
  languageCode: String,
  countryCode: String,
  uule: String,
  url: String, // Added language field
  placements: [PlacementSchema],
  lastChecked: Date,
});

module.exports = KeywordSchema;