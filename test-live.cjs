const puppeteer = require('puppeteer');

(async () => {
  console.log("=== PEERJS CONNECTION TEST ===");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Capture ALL console output
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[MP]') || text.includes('PeerJS') || text.includes('Peer') || 
        text.includes('WebSocket') || text.includes('Error') || text.includes('error') ||
        text.includes('Multiplayer') || text.includes('HOST') || text.includes('open') ||
        text.includes('connection') || text.includes('signal')) {
      console.log('>>> ' + text);
    }
  });
  page.on('pageerror', error => console.log('PAGE_ERROR:', error.message));
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.includes('peer') || url.includes('socket') || url.includes('wss')) {
      console.log('REQUEST_FAILED:', url, request.failure().errorText);
    }
  });

  console.log("1. Loading deployed site...");
  await page.goto('https://lucky-militia-on-stellar.vercel.app/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 6000));

  console.log("2. Clicking Continue as Guest...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const guestBtn = btns.find(b => b.textContent.includes('Continue as Guest'));
    if (guestBtn) { guestBtn.click(); return 'clicked'; }
    return 'not found';
  });
  await new Promise(r => setTimeout(r, 3000));

  // Check what view we're on
  const pageContent = await page.evaluate(() => {
    return document.body.innerText.substring(0, 500);
  });
  console.log("3. Current page text:", pageContent.substring(0, 200));

  // Click multiplayer tab
  console.log("4. Clicking Multiplayer tab...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const mpBtn = btns.find(b => b.textContent.toLowerCase().includes('multiplayer'));
    if (mpBtn) { mpBtn.click(); return 'clicked'; }
    return 'not found: ' + btns.map(b => b.textContent.trim()).join(' | ');
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click Host_Sector
  console.log("5. Clicking Host_Sector...");
  const hostResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const hostBtn = btns.find(b => b.textContent.includes('Host_Sector'));
    if (hostBtn) { hostBtn.click(); return 'clicked Host_Sector'; }
    return 'Host_Sector not found. Buttons: ' + btns.map(b => b.textContent.trim().substring(0, 30)).join(' | ');
  });
  console.log("   Result:", hostResult);

  console.log("6. Waiting 15 seconds for PeerJS WebSocket connection...");
  await new Promise(r => setTimeout(r, 15000));

  // Check final status
  const finalStatus = await page.evaluate(() => {
    // Look for the status message element
    const allText = document.body.innerText;
    const statusMatches = allText.match(/(BROADCASTING|TRANSMITTING|OFFLINE|ERROR|PEER ERR|SERVER_ERR|CODE_COLLISION)[^\n]*/gi);
    return statusMatches ? statusMatches.join(', ') : 'No status found. Page text: ' + allText.substring(0, 300);
  });
  console.log("7. Final connection status:", finalStatus);

  await browser.close();
  console.log("=== TEST COMPLETE ===");
})();
