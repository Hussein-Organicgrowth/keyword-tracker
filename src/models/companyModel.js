const mongoose = require('mongoose');
const KeywordSchema = require('./keywordModel');
const Schema = mongoose.Schema;

const CompanySchema = new Schema({
  companyName: String,
  domain: String,
  keywords: [KeywordSchema],
});

const Company = mongoose.model("Company", CompanySchema);

module.exports = Company;