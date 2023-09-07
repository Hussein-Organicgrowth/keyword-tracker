const mongoose = require('mongoose');
const KeywordSchema = require('./keywordModel');
const Schema = mongoose.Schema;

const CompanySchema = new Schema({
  companyName: { type: String, unique: true },
  domain: { type: String, unique: true },
  keywords: [KeywordSchema],
});

const Company = mongoose.model("Company", CompanySchema);

module.exports = Company;