const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const styles = await page.evaluate(() => {
    const body = document.body;
    const main = document.querySelector('main');
    const csBody = getComputedStyle(body);
    const csMain = main ? getComputedStyle(main) : null;
    return {
      bodyHeight: body.offsetHeight,
      bodyDisplay: csBody.display,
      bodyVisibility: csBody.visibility,
      bodyOpacity: csBody.opacity,
      bodyColor: csBody.color,
      bodyBg: csBody.backgroundColor,
      mainHeight: main?.offsetHeight,
      mainVisibility: csMain?.visibility,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  });
  console.log(JSON.stringify(styles, null, 2));
  await browser.close();
})();
