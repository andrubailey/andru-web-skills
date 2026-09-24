// Usage: node qa-scan.mjs qa/urls.txt   (one URL per line)
import { chromium } from 'playwright';
import fs from 'node:fs';

const urls = fs.readFileSync(process.argv[2], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const widths = [1440, 1200, 1024, 810, 600, 390, 360];
const PLACEHOLDER = String.raw`lorem ipsum|dolor sit amet|\bTBD\b|\bTODO\b|\bXXX\b|your (text|title|heading) here|example\.com|555-\d{4}`;
fs.mkdirSync('qa/shots', { recursive: true });

const browser = await chromium.launch();
const results = [];
for (const url of urls) {
  const slug = (new URL(url).pathname.replace(/\/+$/, '').replace(/\//g, '_') || '_home').slice(1) || 'home';
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(e.message));
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    // Scroll through the page so Framer appear effects and lazy images trigger
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
    const data = await page.evaluate((src) => {
      const vw = window.innerWidth;
      const text = document.body.innerText;
      const imgs = [...document.images];
      const els = [...document.querySelectorAll('body *')];
      const label = el => `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40)}"`;
      return {
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content || null,
        canonical: document.querySelector('link[rel="canonical"]')?.href || null,
        ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
        robots: document.querySelector('meta[name="robots"]')?.content || null,
        lang: document.documentElement.lang || null,
        h1s: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()),
        horizontalOverflowPx: document.documentElement.scrollWidth - vw,
        elementsPastViewport: els.filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed';
        }).slice(0, 8).map(label),
        brokenImages: imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
        imagesMissingAlt: imgs.filter(i => !i.hasAttribute('alt')).map(i => i.src).slice(0, 15),
        imagesEmptyAlt: imgs.filter(i => i.getAttribute('alt') === '').length,
        placeholders: (text.match(new RegExp(`.{0,25}(${src}).{0,25}`, 'gi')) || []).slice(0, 10),
        emDashes: (text.match(/.{0,30}—.{0,30}/g) || []).slice(0, 15),
        stagingLinks: [...document.querySelectorAll('a[href]')].map(a => a.href)
          .filter(h => /framer\.(app|website)|framer\.com\/projects/.test(h)),
        deadLinks: [...document.querySelectorAll('a')]
          .filter(a => !a.getAttribute('href') || a.getAttribute('href') === '#').map(label).slice(0, 10),
        stuckInvisibleText: els.filter(el => getComputedStyle(el).opacity === '0' && el.innerText?.trim())
          .slice(0, 8).map(label),
        buttonsWithoutName: [...document.querySelectorAll('button, a')]
          .filter(el => !el.innerText.trim() && !el.getAttribute('aria-label') && !el.querySelector('img[alt]:not([alt=""])'))
          .length,
      };
    }, PLACEHOLDER);
    const shot = `qa/shots/${slug}-${w}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    results.push({ url, width: w, status: res?.status(), screenshot: shot, consoleErrors, ...data });
    await page.close();
  }
}
await browser.close();
fs.writeFileSync('qa/scan.json', JSON.stringify(results, null, 2));
console.log(`Scanned ${urls.length} URLs x ${widths.length} widths. Results: qa/scan.json, screenshots: qa/shots/`);
