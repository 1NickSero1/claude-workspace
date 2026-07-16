const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const htmlPath = path.join(__dirname, '_tmp-directorio-resumen.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.join(__dirname, 'PDF', 'ruta-segura-directorio-resumen.pdf'),
    format: 'A4',
    printBackground: true,
  });
  await browser.close();
  console.log('PDF generado correctamente.');
})();
