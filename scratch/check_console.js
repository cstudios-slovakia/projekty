const { chromium } = require('playwright-core');

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}\n${err.stack}`);
  });

  console.log("Navigating to https://projektyerik.cstudios.sk/#/ ...");
  try {
    await page.goto('https://projektyerik.cstudios.sk/#/', { timeout: 10000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log("Navigation timed out or failed:", e.message);
  }
  
  await browser.close();
  console.log("Done.");
}

run().catch(console.error);
