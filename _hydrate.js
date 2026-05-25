const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGE: ' + e.message));
  page.on('console', m => { if (['error','warning'].includes(m.type())) errors.push(m.type()+': '+m.text()); });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const phases = await page.evaluate(() => ({
    immediate: document.body.innerText.trim().slice(0,50),
    hiddenCount: [...document.querySelectorAll('*')].filter(el => getComputedStyle(el).display==='none' && el.innerText?.includes('To get started')).length,
    reactRoot: !!document.querySelector('#__next'),
  }));
  console.log({ phases, errors });
  await browser.close();
})();
