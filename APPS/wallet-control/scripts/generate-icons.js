// Genera los assets de icono "Anillo de Progreso" (concepto #7 del PDF de ESTETIK,
// 22 jul 2026) en las resoluciones que pide app.json. Script de un solo uso —
// se puede borrar junto con la dependencia temporal "sharp" después de correrlo.
const sharp = require('sharp');
const path = require('path');

const PURPLE = '#6C5CE7';
const WHITE = '#FFFFFF';
const OUT = path.join(__dirname, '..', 'assets', 'images');

// Anillo abierto (progreso ~72%), stroke redondeado, centrado en 512,512.
function ring({ radius, strokeWidth, color }) {
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * 0.72;
  const gap = circumference - progress;
  return `<circle cx="512" cy="512" r="${radius}" fill="none" stroke="${color}"
    stroke-width="${strokeWidth}" stroke-linecap="round"
    stroke-dasharray="${progress} ${gap}" transform="rotate(-90 512 512)" />`;
}

function squircleBg(color) {
  return `<rect x="0" y="0" width="1024" height="1024" rx="228" ry="228" fill="${color}" />`;
}

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  ${squircleBg(PURPLE)}
  ${ring({ radius: 260, strokeWidth: 90, color: WHITE })}
</svg>`;

const svgForeground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  ${ring({ radius: 260, strokeWidth: 90, color: WHITE })}
</svg>`;

const svgBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  ${squircleBg(PURPLE).replace('rx="228" ry="228"', 'rx="0" ry="0"')}
</svg>`;

const svgMonochrome = svgForeground;

const svgSplash = svgForeground;

const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  ${squircleBg(PURPLE)}
  ${ring({ radius: 300, strokeWidth: 130, color: WHITE })}
</svg>`;

async function run() {
  await sharp(Buffer.from(svgIcon)).resize(1024, 1024).png().toFile(path.join(OUT, 'icon.png'));
  await sharp(Buffer.from(svgForeground)).resize(1024, 1024).png().toFile(path.join(OUT, 'android-icon-foreground.png'));
  await sharp(Buffer.from(svgBackground)).resize(1024, 1024).png().toFile(path.join(OUT, 'android-icon-background.png'));
  await sharp(Buffer.from(svgMonochrome)).resize(1024, 1024).png().toFile(path.join(OUT, 'android-icon-monochrome.png'));
  await sharp(Buffer.from(svgSplash)).resize(1024, 1024).png().toFile(path.join(OUT, 'splash-icon.png'));
  await sharp(Buffer.from(svgFavicon)).resize(48, 48).png().toFile(path.join(OUT, 'favicon.png'));
  console.log('Listo: 6 archivos generados en assets/images/');
}

run().catch(e => { console.error(e); process.exit(1); });
