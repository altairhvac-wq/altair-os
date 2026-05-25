const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{w:375,h:667,name:'mobile'},{w:1280,h:720,name:'desktop'}]) {
    const page = await browser.newPage({ viewport: vp });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const info = await page.evaluate(() => ({
      text: document.body.innerText.trim().slice(0, 80),
      bodyH: document.body.offsetHeight,
      scrollH: document.documentElement.scrollHeight,
      hidden: document.body.innerText.trim().length === 0,
    }));
    console.log(vp.name, info, 'errors:', errors);
  }
  await browser.close();
})();
