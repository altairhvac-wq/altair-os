const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, colorScheme: 'dark' });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const cs = h1 ? getComputedStyle(h1) : null;
    return { text: document.body.innerText.trim().slice(0,50), h1Color: cs?.color, bg: getComputedStyle(document.body).backgroundColor };
  });
  console.log(info);
  await browser.close();
})();
