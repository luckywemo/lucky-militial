const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Page loaded, taking screenshot...');
    await page.screenshot({ path: 'artifacts/screenshot.png' });
    console.log('Screenshot saved to artifacts/screenshot.png');
  } catch (e) {
    console.log(`Navigation error: ${e.message}`);
  }

  await browser.close();
})();
