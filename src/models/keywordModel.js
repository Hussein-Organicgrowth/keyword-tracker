const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlacementSchema = new Schema({
  date: Date,
  rank: Number,
});

const KeywordSchema = new Schema({
  keyword: String,
  category: String,
  language: String, // Added language field
  placements: [PlacementSchema],
  lastChecked: Date,
});

module.exports = KeywordSchema;