const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const content = document.querySelector('body > div:not([hidden])');
    const cs = content ? getComputedStyle(content) : null;
    return {
      found: !!content,
      className: content?.className,
      offsetHeight: content?.offsetHeight,
      display: cs?.display,
      visibility: cs?.visibility,
      opacity: cs?.opacity,
      bodyChildren: [...document.body.children].map(c => ({ tag: c.tagName, hidden: c.hidden, class: c.className, h: c.offsetHeight })),
    };
  });
  console.log(JSON.stringify({ info, errors }, null, 2));
  await browser.close();
})();
