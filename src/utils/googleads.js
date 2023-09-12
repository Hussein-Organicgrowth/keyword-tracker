const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { ElementHandle } = require('puppeteer');  // Import ElementHandle from 'puppeteer'


puppeteer.use(StealthPlugin());

async function getKeywordSearchVolume(keyword, languageCode){
    const browser = await puppeteer.launch({
        //  args: ['--no-sandbox', `--proxy-server=${proxyServer}`],
          headless: true
        })

    
        const page = await browser.newPage();
        await page.goto(`https://seomator.com/free-keyword-research-tool`, {waitUntil: 'networkidle0'});
        // Wait for the iframe to load
await page.waitForSelector('iframe');

// Get the iframe element
const frameElement = await page.$('iframe');

// Get the frame object
const frame = await frameElement.contentFrame();

// Now you can interact with the elements inside the iframe
await frame.waitForSelector('.select-input');
await frame.select('.select-input', languageCode.toUpperCase());
await frame.type('input[name="keyword"]', keyword);
await frame.click('button.loadable');
await frame.waitForSelector('#keywords tbody tr:first-child td:first-child');

let value = await frame.$eval('#keywords tbody tr:first-child td:first-child', el => el.textContent);
console.log(value);
let volume = await frame.$eval('#keywords tbody tr:first-child td:nth-child(4)', el => el.textContent);
console.log(volume);
return volume;

}



module.exports = getKeywordSearchVolume;