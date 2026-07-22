const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const htmlPath = process.argv[2];
  const outPath = process.argv[3];
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(htmlPath), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  await browser.close();
  console.log('OK ->', outPath);
})();
