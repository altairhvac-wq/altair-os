const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('**/*.css', route => route.abort());
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const text = await page.locator('body').innerText();
  console.log('Without CSS, text length:', text.trim().length);
  console.log('Preview:', text.trim().slice(0, 100));
  await browser.close();
})();
