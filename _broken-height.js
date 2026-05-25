const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => {
    document.documentElement.style.height = 'auto';
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => ({
    textLen: document.body.innerText.trim().length,
    contentH: document.querySelector('body > div:not([hidden])')?.offsetHeight,
    bodyH: document.body.offsetHeight,
  }));
  console.log(info);
  await browser.close();
})();
