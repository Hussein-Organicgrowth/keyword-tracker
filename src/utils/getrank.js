const axios = require('axios');


async function getRanking(keyword, domain){
    const simplifiedDomain = getSimplifyUrl(domain);
    try {
      const response = await axios.post('https://api.scrapingrobot.com/', {
        url: 'https://www.google.com',
        module: 'GoogleScraper',
        params: {
          countryCode: 'dk',
          proxyCountry: 'DK',
          languageCode: 'da',
          num: 100,
          query: keyword
        }
      }, {
        params: {
          token: '30fc8b90-8952-4a16-a201-286bd47fb1d6'
        }
      });
  
      const organicResults = response.data.result.organicResults;
      for (let i = 0; i < organicResults.length; i++) {
        let simplifiedUrl = getSimplifyUrl(organicResults[i].url);
        if (simplifiedUrl.includes(simplifiedDomain)) {
          console.log(`Domain found at position ${i + 1}`);
          return { position: i + 1, url: organicResults[i].url };
        }
      }
      return { position: 100, url: "" };
    } catch (err) {
      console.error(err);
    }
  }

function getSimplifyUrl(url) {
    if (!url) {
        throw new Error('Invalid URL');
      }
    // Remove 'http://' or 'https://'
    let simplifiedUrl = url.replace(/(http:\/\/|https:\/\/)/, '');
  
    // Remove 'www.'
    simplifiedUrl = simplifiedUrl.replace('www.', '');
  
    // Remove the path
    simplifiedUrl = simplifiedUrl.split('/')[0];
  
    return simplifiedUrl;
  }

module.exports = getRanking;

//30fc8b90-8952-4a16-a201-286bd47fb1d6
