const express = require('express');
const app = express();
const port = 3000;
const mongoose = require("mongoose");
const path = require('path');
const bodyParser = require('body-parser');
const Company = require('./src/models/companyModel');
const findRankingForDomain = require('./src/utils/puppeteer'); // import your function
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Route to handle form submission
app.post('/add-company', async (req, res) => {
  const companyName = req.body.companyName;
  const domain = req.body.domain;

  // Create a new instance of the Company model
  const newCompany = new Company({
    companyName: companyName,
    domain: domain,
    keywords: []
  });

  // Save the new company to the database
  try {
    await newCompany.save();
    // Redirect back to the home page
    console.log("Test");
    res.redirect('/');
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate company detected
      return res.status(500).send('Duplicate company detected');
    }
    console.error(err);
    res.status(500).send('An error occurred while saving the company');
  }
});

app.delete('/delete-company/:name', async (req, res) => {
  try {
    await Company.findOneAndRemove({ companyName: req.params.name });
    res.status(200).send('Company deleted');
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while deleting the company');
  }
});
app.get('/findRanking', async (req, res) => {
  const keyword = req.query.keyword;
  const domain = req.query.domain;

  if (!keyword || !domain) {
    return res.status(400).send('Missing keyword or domain');
  }

  try {
    const result = await findRankingForDomain(keyword, domain);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred');
  }
});
app.get('/keywords/:companyName', async (req, res) => {
  const companyName = req.params.companyName;
  const company = await Company.findOne({ companyName: companyName });
  res.render('keywords', { company: company });
});
async function getRanking(keyword, domain) {
  let ranking = -1;

  while (ranking === -1) {
    ranking = await findRankingForDomain(keyword, domain);
  }

  return ranking;
}
app.post('/add-keyword/:companyName', async (req, res) => {
  const companyName = req.params.companyName;
  const keywords = req.body.keywords.split('\n');
  const category = req.body.category;
  const date = new Date(); // get current date

  // Validation checks
  if (!companyName) {
    return res.status(400).send('Missing company name');
  }
  if (!keywords) {
    return res.status(400).send('Missing keywords');
  }

  const company = await Company.findOne({ companyName: companyName });

  // Check if company exists
  if (!company) {
    return res.status(404).send('Company not found');
  }

  // Get the domain from the company object
  const domain = company.domain;

  // Loop through each keyword
  for (const keyword of keywords) {
    // Get the ranking for the keyword
    const rank = await getRanking(keyword, domain);

    // Create a new placement
    const newPlacement = {
      date: date,
      rank: rank
    };

    // Create a new keyword object
    const newKeyword = {
      keyword: keyword,
      category: category,
      placements: [newPlacement], // include new placement in placements array
      lastChecked: date
    };

    company.keywords.push(newKeyword);
  }

  await company.save();
  res.redirect('/keywords/' + companyName);
});

app.get('/', async (req, res) => {
  // Fetch the companies from the database
  try {
    const companies = await Company.find({});
    // Render index.ejs with the companies data
    res.render('index', { companies: companies });
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while fetching the companies');
  }
});

app.post('/delete-keyword/:companyName/:keyword', async (req, res) => {
  const companyName = req.params.companyName;
  const keyword = req.params.keyword;

  const company = await Company.findOne({ companyName: companyName });

  // Check if company exists
  if (!company) {
    return res.status(404).send('Company not found');
  }

  // Find the keyword to delete
  const keywordIndex = company.keywords.findIndex(k => k.keyword === keyword);

  // Check if keyword exists
  if (keywordIndex === -1) {
    return res.status(404).send('Keyword not found');
  }

  // Remove the keyword
  company.keywords.splice(keywordIndex, 1);
  await company.save();

  res.redirect('/keywords/' + companyName);
});

app.post('/update-keyword/:companyName/:keyword', async (req, res) => {
  const companyName = req.params.companyName;
  const keyword = req.params.keyword;
  const date = new Date(); // get current date

  const company = await Company.findOne({ companyName: companyName });

  // Check if company exists
  if (!company) {
    return res.status(404).send('Company not found');
  }

  // Find the keyword to update
  const keywordObj = company.keywords.find(k => k.keyword === keyword);

  // Check if keyword exists
  if (!keywordObj) {
    return res.status(404).send('Keyword not found');
  }

  // Get the ranking for the keyword
  const rank = await getRanking(keyword, company.domain);

  // Create a new placement
  const newPlacement = {
    date: date,
    rank: rank
  };

  // Update the placements array and lastChecked date
  keywordObj.placements.push(newPlacement);
  keywordObj.lastChecked = date;

  await company.save();

  res.redirect('/keywords/' + companyName);
});


// Connect to the database
const uri = "mongodb+srv://hussein:admin@keywords.ze8giui.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", async function () {
  console.log("Connected to MongoDB!");

  
});

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
});
// Folder Structure
// root
//  - server.js: This is the main entry point of your application. It sets up your express server and includes the routes.
//  - package.json: This file holds various metadata relevant to the project. It's used to manage the project's dependencies, scripts, version and a whole lot more.
//  - src: This folder contains the main source code for your application.
//    - controllers: This folder contains the logic for handling requests and sending responses (keywordController.js).
//    - models: This folder contains the data models for your application (keywordModel.js).
//    - routes: This folder contains the route definitions for your application (keywordRoutes.js).
//    - utils: This folder contains utility files that can be used across your application (puppeteer.js).
//  - views: This folder contains the EJS (Embedded JavaScript) templates for your application.
//  - public: This folder contains the static files (CSS, JS) for your application.
//    - css: This folder contains the CSS files for your application.
//    - js: This folder contains the JavaScript files for your application.

// Note: This is just a suggested structure. You can modify it according to your needs.
