const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '_screenshot.png', fullPage: true });
  const outer = await page.evaluate(() => {
    const el = document.querySelector('body > div');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { offsetHeight: el.offsetHeight, flex: cs.flex, minHeight: cs.minHeight, overflow: cs.overflow, display: cs.display };
  });
  console.log('outer div:', outer);
  await browser.close();
})();
