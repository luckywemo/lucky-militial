import puppeteer from 'puppeteer';
import 'dotenv/config';

const APP_URL = process.env.VITE_APP_URL || 'http://localhost:3000';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  page.on('pageerror', error => {
      console.log('[BROWSER UNCAUGHT EXCEPTION]', error.message);
  });

  console.log(`Navigating to ${APP_URL}...`);
  try {
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log(`STATUS: ${response?.status()}`);
  } catch (e) {
    console.log('Finished waiting for navigation (timeout or success)', e.message);
  }

  // Wait extra time for React to render if it was just slow
  await new Promise(resolve => setTimeout(resolve, 5000));

  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML : 'NO ROOT ELEMENT';
  });

  console.log('ROOT HTML LENGTH:', rootContent.length);
  
  await browser.close();
})();
