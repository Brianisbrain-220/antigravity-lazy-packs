const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: "new"});
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
  
  console.log("Navigating...");
  await page.goto('https://cjps-admin-hub-consumables.web.app/');
  
  console.log("Waiting for 5 seconds...");
  await new Promise(r => setTimeout(r, 5000));
  
  const loaderDisplay = await page.evaluate(() => {
     return document.getElementById('loader').style.display;
  });
  console.log("Loader display is:", loaderDisplay);
  
  await browser.close();
})();
