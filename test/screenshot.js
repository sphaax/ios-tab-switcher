// Dev-only : sert la racine du dépôt (dont un faux /_favicon/) et capture la
// fixture en deux tailles. Usage : node test/screenshot.js <iterN>
// Aucune dépendance runtime de l'extension ; Playwright reste devDependency.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4319;
const ITER = process.argv[2] || '0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// Faux favicon : petit carré arrondi coloré, teinte dérivée de l'URL. Les
// onglets marqués "nofav" reçoivent un 404 -> teste le repli sans favicon.
function faviconSvg(pageUrl) {
  let h = 0;
  for (const c of pageUrl) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="hsl(${hue} 65% 55%)"/>
    <circle cx="16" cy="16" r="6" fill="hsl(${hue} 70% 88%)"/>
  </svg>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/_favicon/') {
    const pageUrl = url.searchParams.get('pageUrl') || '';
    if (pageUrl.includes('nofav')) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
    res.end(faviconSvg(pageUrl));
    return;
  }
  let rel = url.pathname === '/' ? '/test/fixture.html' : url.pathname;
  const file = path.join(ROOT, decodeURIComponent(rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  });
});

const SIZES = [
  { label: '1920', width: 1920, height: 1080 },
  { label: '1280', width: 1280, height: 720 },
];

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const outDir = path.join(__dirname, 'shots');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  for (const size of SIZES) {
    const page = await browser.newPage({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
    });
    await page.goto(`http://localhost:${PORT}/test/fixture.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__fixtureReady === true, { timeout: 10000 });
    await page.waitForSelector('.grid .card', { timeout: 10000 });
    // Laisse la cascade d'apparition et la peinture des fonds de groupe finir.
    await page.waitForTimeout(1500);
    // FOCUS_NTH=<n> : simule la navigation clavier en focalisant la n-ième
    // carte de la grille (pour tester l'état de focus, ex. le cadre bleu).
    let suffix = '';
    if (process.env.FOCUS_NTH != null) {
      const n = Number(process.env.FOCUS_NTH);
      await page.evaluate((i) => document.querySelectorAll('.grid .card')[i]?.focus(), n);
      await page.waitForTimeout(200);
      suffix = `-focus${n}`;
    }
    const out = path.join(outDir, `iter-${ITER}${suffix}-${size.label}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log('saved', path.relative(ROOT, out));
    await page.close();
  }
  await browser.close();
  await new Promise((r) => server.close(r));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
