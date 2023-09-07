const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { ElementHandle } = require('puppeteer');  // Import ElementHandle from 'puppeteer'

puppeteer.use(StealthPlugin());
async function findRankingForDomain(keyword, domain) {
    const simplifiedDomain = simplifyUrl(domain);
    let position = 0;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto("https://www.google.com");
    
    const content = await page.content();
    
    try {
      // Waiting for the cookie banner to load
      const buttonText =
        process.env.NODE_ENV === "production"
          ? '[aria-label="Alle akzeptieren"]'
          : '[aria-label="Acceptér alle"]';
      
      await page.waitForSelector(".QS5gu.sy4vM");
       // wait for the element to appear on the page
      const acceptButton = await page.$x(
        "//div[contains(@class, 'QS5gu') and contains(@class, 'sy4vM') and contains(text(), 'Acceptér alle')]"
      );
  
      if (acceptButton.length > 0) {
        await acceptButton[0].click();
        console.log("Clicked the cookie banner");
      }
      
      await page.waitForSelector("textarea[name=q]");
     
      await page.type("textarea[name=q]", keyword);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 2 seconds

      await page.keyboard.press("Enter");
      
      // Wait for search results to load
      
      await page.waitForSelector("#search");
     
      let found = false;
      let pageNum = 1;
      const maxPagesToSearch = 100; // set a limit to how many pages to search through
      let pageTal = 1;
      let linkArray = [];
      
      while (!found && pageNum <= maxPagesToSearch) {
        const links = await page.$$eval("h3", (links) =>
          links.map((link) => link.parentElement.href)
        );
        console.log("LINKS LENGETH: " + links.length);
  
        for (let i = 0; i < links.length; i++) {
            const url = links[i];
            if(!url) continue;
            const simplifiedUrl = simplifyUrl(url);
            
           
            //Only add a number when a url hasn't been found already to aviod duplice urls
            if(!linkArray.includes(simplifiedUrl)){
                linkArray.push(simplifiedUrl);
                position++;
                
            }
          if (simplifiedUrl.includes(simplifiedDomain)) {
            found = true;
            
            console.log(
              `Found ${simplifiedDomain} at position ${position} on page ${pageNum}`
            );
            return position;
            
          }
        }
        if (found) {
            console.log("Breaking the while loop because the domain was found.");
            return position;
              // Breaking the while loop
          }
  
        if (!found) {
          pageTal++;
          let pageString = "Page " + pageTal;
          const nextPageLink = await page.$(`a[aria-label="${pageString}"].fl`);
          console.log("NEXTPAGELINK: " + nextPageLink);
  
          if (nextPageLink) {
            console.log('Clicking on next page link');

            await nextPageLink.click();
            await page.waitForSelector("#search"); // Ensure the results are loaded
            pageNum++;
          } else {
            let moreResultsButton;
            for (let i = 0; i < 25; i++) {
              // try scrolling 5 times or adjust as necessary
              await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight / 2); // scroll half the viewport height
              });
  
              await page.waitForTimeout(1000); // Wait a bit for potential dynamic content to load
  
              moreResultsButton = await page.$("a.T7sFge.sW9g3e.VknLRd");
              if (moreResultsButton) break; // exit loop once button is found
            }
  
            if (moreResultsButton instanceof ElementHandle) {
                console.log('Clicking on more results button');
                await page.waitForSelector("a.T7sFge.sW9g3e.VknLRd", { visible: true, timeout: 5000 });  // Wait for the button to be visible

                await page.waitForTimeout(1000);
              await moreResultsButton.click();
              await page.waitForSelector("#search"); // Ensure the results are loaded
              pageNum++;
             

            } else {
                console.log("Breaking the while loop because there are no more results or pages to show after trying to scroll.");
                return -1;
              break; // No more results or pages to show after trying to scroll
            }
          }
        }
      }
  
      if (!found) {
        return 100;
      }
  
      await browser.close();
    } catch (e) {
      console.log("Cookie banner not found or already accepted. "  + e);
      return -1;
    }
    // Input the keyword into Google search and click the search button
  }

  function simplifyUrl(url) {
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
  module.exports = findRankingForDomain;