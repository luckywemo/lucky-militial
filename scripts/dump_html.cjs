const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
    const html = await page.evaluate(() => document.getElementById('root').innerHTML);
    require('fs').writeFileSync('artifacts/dump.html', html);
    console.log('HTML saved to artifacts/dump.html');
  } catch (e) {
    console.log(`Navigation error: ${e.message}`);
  }

  await browser.close();
})();
