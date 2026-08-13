const puppeteer = require('puppeteer');
const path = require('path');

const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Test Inicial - Perfil Emprendedor</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
    line-height: 1.55;
  }
  h1 {
    font-size: 26px;
    border-bottom: 3px solid #1a1a1a;
    padding-bottom: 12px;
    margin-bottom: 4px;
  }
  .subtitle {
    color: #555;
    font-size: 13px;
    margin-bottom: 30px;
  }
  h2 {
    font-size: 17px;
    background: #1a1a1a;
    color: #fff;
    padding: 8px 14px;
    margin-top: 28px;
    margin-bottom: 12px;
    border-radius: 4px;
  }
  h3 {
    font-size: 14.5px;
    margin: 14px 0 4px 0;
  }
  p, li { font-size: 13.5px; }
  ul, ol { padding-left: 22px; margin: 6px 0; }
  li { margin-bottom: 6px; }
  .archetype {
    font-size: 19px;
    font-weight: bold;
    color: #0a5c36;
  }
  .block {
    border-left: 3px solid #ddd;
    padding-left: 14px;
    margin-bottom: 16px;
  }
  .result {
    font-style: italic;
    color: #555;
    font-size: 13px;
  }
  footer {
    margin-top: 40px;
    font-size: 11px;
    color: #999;
    text-align: center;
    border-top: 1px solid #eee;
    padding-top: 10px;
  }
</style>
</head>
<body>

<h1>Test Inicial — Perfil Emprendedor</h1>
<div class="subtitle">Mateo · 13 de agosto de 2026</div>

<h2>1. Perfil emprendedor: <span class="archetype">El Cerrador Resiliente</span></h2>
<p>Tu perfil combina algo poco común: casi cero capital (0–500k COP) con una disposición a sacrificar todo lo demás — tiempo libre, comodidad y ahorros — para que esto funcione. No tienes miedo específico (ni a perder plata, ni al juicio ajeno); lo que realmente te frena es no saber por dónde arrancar. Y cuando algo te sale mal, no te quedas paralizado: lo analizas, ajustas y sigues rápido. Esa combinación — bajo capital + alto compromiso + resiliencia real ante el fracaso — es la base de un perfil comercial, no de un perfil de "creador" o "planificador".</p>

<h2>2. La habilidad que más se adapta</h2>
<p><strong>Comunicación/venta.</strong> Lo dijiste dos veces sin contradecirte: es lo que ya sabes hacer bien y es el rol que elegirías dentro de cualquier negocio (vender). No es una habilidad "por desarrollar" — ya la tienes. El punto ciego no es la habilidad, es no tener todavía el canal ni el nicho donde aplicarla.</p>

<h2>3. El tipo de negocio ideal</h2>
<p>Con capital casi nulo, 5–15 horas/semana, ingresos ya variables (freelance, acostumbrado a la incertidumbre) y afinidad por salud/bienestar/estilo de vida, esto encaja mejor que "crear un producto":</p>
<ol>
  <li><strong>Ventas comisionadas para negocios de bienestar locales</strong> — ofrecerte a estudios de yoga, gimnasios boutique, nutricionistas o spas para cerrarles clientes nuevos a cambio de comisión. Cero inversión, arranca en días, usa exactamente tu habilidad más fuerte.</li>
  <li><strong>Broker de alianzas en el nicho de bienestar</strong> — conectar negocios/creadores de contenido de bienestar con marcas o servicios complementarios, cobrando comisión por cada alianza cerrada. Mismo principio (vender relaciones, no productos), pero más escalable a mediano plazo.</li>
</ol>

<h2>4. Por dónde empezar (esta semana)</h2>
<p>Elige <strong>un</strong> subnicho de bienestar (no "bienestar" en general — ej. estudios de yoga o gimnasios boutique de tu ciudad) y contacta directamente a 5 de ellos con una propuesta simple: <em>"te consigo clientes nuevos, me pagas solo si cierro"</em>. Sin fee fijo, sin propuesta elaborada, sin esperar a tener un plan perfecto — tu punto ciego real es la parálisis por no saber por dónde arrancar, así que el primer paso es deliberadamente pequeño y sin fricción.</p>

<h2>5. Plan de 90 días</h2>
<div class="block">
  <h3>Días 1–30 — Validación</h3>
  <ul>
    <li>Elegir el subnicho específico dentro de bienestar</li>
    <li>Contactar 15–20 negocios con la propuesta "comisión por cliente cerrado"</li>
    <li>Cerrar al menos 2 acuerdos de prueba</li>
  </ul>
  <p class="result">Resultado esperado: 2 negocios con acuerdo (aunque sea informal) para vender a comisión.</p>
</div>
<div class="block">
  <h3>Días 31–60 — Ejecución y ajuste</h3>
  <ul>
    <li>Vender activamente para esos 2 negocios (prospección, llamadas, redes)</li>
    <li>Medir cuántos clientes cierras por semana y cuánto ganas en comisión real</li>
    <li>Buscar un socio o colaborador — encaja con tu preferencia por trabajar en equipo, y con tu disposición a sacrificar ahorros</li>
  </ul>
  <p class="result">Resultado esperado: primeros ingresos reales por comisión + un colaborador sumado.</p>
</div>
<div class="block">
  <h3>Días 61–90 — Escalar y sistematizar</h3>
  <ul>
    <li>Documentar el proceso de venta que mejor te funcionó (script, canal, tipo de negocio)</li>
    <li>Ampliar a 2–3 negocios más usando ese mismo proceso</li>
    <li>Evaluar qué parte de la prospección puedes delegar</li>
  </ul>
  <p class="result">Resultado esperado: ingresos recurrentes de al menos 3 negocios + un proceso repetible por escrito.</p>
</div>

<h2>6. Errores que debes evitar</h2>
<ol>
  <li><strong>Sobre-planear antes de vender el primer servicio.</strong> Tu freno real no es el miedo, es no saber por dónde empezar — y con capital casi nulo, planear de más es un lujo que no tienes. El plan se valida vendiendo, no diseñando.</li>
  <li><strong>Trabajar gratis "para ganar experiencia".</strong> Tu fortaleza es vender — si regalas el trabajo desde el día 1, entrenas el hábito equivocado. Cobra comisión desde el primer cliente, aunque sea pequeña.</li>
  <li><strong>Esperar a tener socio para arrancar.</strong> Prefieres equipo, pero ya tienes colchón de incertidumbre por tu experiencia freelance — arranca solo, suma equipo en el bloque 2, no antes.</li>
  <li><strong>Dispersarte entre demasiados nichos de "bienestar".</strong> Con 5–15 horas/semana no te alcanza para atacar yoga, nutrición y gimnasios a la vez. Un subnicho, no la categoría completa.</li>
</ol>

<h2>7. Recursos recomendados</h2>
<ul>
  <li><em>To Sell Is Human</em> — Daniel Pink (vender sin sentirte "vendedor", directo a tu rol favorito)</li>
  <li><em>The Mom Test</em> — Rob Fitzgerald (validar con clientes reales sin engañarte a ti mismo)</li>
  <li>Grupos de Facebook/LinkedIn de dueños de gimnasios boutique y estudios de yoga en tu ciudad — ahí están tus primeros prospectos</li>
  <li>Contenido gratuito de prospección en frío / cold outreach en YouTube (canales de ventas B2B) — para script y manejo de objeciones</li>
  <li>WhatsApp Business + Google Sheets como CRM gratuito — trackear prospectos y comisiones sin gastar en software</li>
</ul>

<footer>Test Inicial Financiero — generado automáticamente</footer>

</body>
</html>
`;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const outPath = path.join(__dirname, '..', '..', 'P.P', 'MATEO', 'test-inicial-financiero-2026-08-13.pdf');
  await page.pdf({ path: outPath, format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '10px', right: '10px' } });
  await browser.close();
  console.log('PDF generado en: ' + outPath);
})();
