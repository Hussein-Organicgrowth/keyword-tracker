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
  const categories = [...new Set(company.keywords.map(keywordObj => keywordObj.category.toLowerCase().trim()))];

  res.render('keywords', { company: company, languages: languages, categories: categories });
});
async function getRanking(keyword, domain, languageCode) {
  let ranking = -1;

  while (ranking === -1) {
    ranking = await findRankingForDomain(keyword, domain, languageCode);
  }

  return ranking;
}
app.post('/add-keyword/:companyName', async (req, res) => {
  const companyName = req.params.companyName;
  const keywords = req.body.keywords.split('\n');
  const category = req.body.category;
  const languageCode = req.body.language; // Get the selected language code
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
    const rank = await getRanking(keyword, domain, languageCode);

    // Create a new placement
    const newPlacement = {
      date: date,
      rank: rank
    };

    // Create a new keyword object
    const newKeyword = {
      keyword: keyword,
      category: category,
      language: languageCode, // Include the language code
      placements: [newPlacement], // include new placement in placements array
      lastChecked: date
    };

    company.keywords.push(newKeyword);
  }

  await company.save();
  res.redirect('/keywords/' + companyName);
});

app.post('/delete-category/:companyName/:category', async (req, res) => {
  const companyName = req.params.companyName;
  const category = req.params.category;

  // Find the company
  const company = await Company.findOne({ companyName: companyName });

  // Filter out the keywords of the category
  company.keywords = company.keywords.filter(keywordObj => keywordObj.category.toLowerCase().trim() !== category);

  // Save the changes
  await company.save();

  // Redirect back to the keywords page
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
  console.log(keyword);
  console.log(companyName);
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

  // Save the changes
  await company.markModified('keywords');
  await company.save();

  res.redirect('/keywords/' + companyName);
});

app.get('/get-placements/:companyName/:keyword', async function(req, res) {
  var companyName = req.params.companyName;
  var keyword = req.params.keyword;
  const company = await Company.findOne({ companyName: companyName });

  const keywordObj = company.keywords.find(k => k.keyword === keyword);
  if(keywordObj){
    res.json(keywordObj.placements);
  }else{
    res.status(404).send('Keyword not found');
  }
 
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
const languages = [
  { name: 'Amharic', code: 'am' },
  { name: 'Arabic', code: 'ar' },
  { name: 'Basque', code: 'eu' },
  { name: 'Bengali', code: 'bn' },
  { name: 'English (UK)', code: 'en-GB' },
  { name: 'Portuguese (Brazil)', code: 'pt-BR' },
  { name: 'Bulgarian', code: 'bg' },
  { name: 'Catalan', code: 'ca' },
  { name: 'Cherokee', code: 'chr' },
  { name: 'Croatian', code: 'hr' },
  { name: 'Czech', code: 'cs' },
  { name: 'Danish', code: 'da' },
  { name: 'Dutch', code: 'nl' },
  { name: 'English (US)', code: 'en' },
  { name: 'Estonian', code: 'et' },
  { name: 'Filipino', code: 'fil' },
  { name: 'Finnish', code: 'fi' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' },
  { name: 'Greek', code: 'el' },
  { name: 'Gujarati', code: 'gu' },
  { name: 'Hebrew', code: 'iw' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Hungarian', code: 'hu' },
  { name: 'Icelandic', code: 'is' },
  { name: 'Indonesian', code: 'id' },
  { name: 'Italian', code: 'it' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Kannada', code: 'kn' },
  { name: 'Korean', code: 'ko' },
  { name: 'Latvian', code: 'lv' },
  { name: 'Lithuanian', code: 'lt' },
  { name: 'Malay', code: 'ms' },
  { name: 'Malayalam', code: 'ml' },
  { name: 'Marathi', code: 'mr' },
  { name: 'Norwegian', code: 'no' },
  { name: 'Polish', code: 'pl' },
  { name: 'Portuguese (Portugal)', code: 'pt-PT' },
  { name: 'Romanian', code: 'ro' },
  { name: 'Russian', code: 'ru' },
  { name: 'Serbian', code: 'sr' },
  { name: 'Chinese (PRC)', code: 'zh-CN' },
  { name: 'Slovak', code: 'sk' },
  { name: 'Slovenian', code: 'sl' },
  { name: 'Spanish', code: 'es' },
  { name: 'Swahili', code: 'sw' },
  { name: 'Swedish', code: 'sv' },
  { name: 'Tamil', code: 'ta' },
  { name: 'Telugu', code: 'te' },
  { name: 'Thai', code: 'th' },
  { name: 'Chinese (Taiwan)', code: 'zh-TW' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Urdu', code: 'ur' },
  { name: 'Ukrainian', code: 'uk' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'Welsh', code: 'cy' }
];