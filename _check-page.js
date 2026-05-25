const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const logs = [];
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
    logs.push(msg.type() + ': ' + msg.text());
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const text = await page.locator('body').innerText();
  const html = await page.content();
  console.log('BODY TEXT:', JSON.stringify(text.slice(0, 500)));
  console.log('HAS H1:', html.includes('To get started'));
  console.log('ERRORS:', JSON.stringify(errors, null, 2));
  console.log('LOGS:', JSON.stringify(logs.slice(0, 20), null, 2));
  await browser.close();
})();
