const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const htmlPath = process.argv[2];
  const outDir = process.argv[3];
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1.5 });
  await page.goto('file://' + path.resolve(htmlPath), { waitUntil: 'networkidle0' });

  const boxes = await page.$$eval('.page', els => els.map(el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
  }));

  const indicesToGrab = [0, 1, 3, boxes.length - 1];
  for (const i of indicesToGrab) {
    if (i < 0 || i >= boxes.length) continue;
    const b = boxes[i];
    await page.screenshot({
      path: path.join(outDir, `page-${i + 1}.png`),
      clip: { x: 0, y: b.y, width: b.width, height: b.height },
    });
  }
  await browser.close();
  console.log('done', boxes.length, 'pages total');
})();
