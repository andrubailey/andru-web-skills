// Browser pass: every page at every width in Chromium and WebKit (Safari's engine).
// Usage: node qa/tools/scan.mjs qa/urls.txt [--browsers chromium,webkit] [--widths 1440,1280,1024,768,600,390,360] [--no-shots]
// Writes qa/scan.json, qa/scan-summary.md and screenshots in qa/shots/<browser>/.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium, webkit } from 'playwright';
import { loadEnv, parseArgs, readLines, slugFor, writeJson, bypassHeadersFor } from './lib.mjs';

loadEnv();
const args = parseArgs();
const urls = readLines(args._[0] || 'qa/urls.txt');
const widths = String(args.widths || '1440,1280,1024,768,600,390,360').split(',').map(Number);
const engines = { chromium, webkit };
const browsers = String(args.browsers || 'chromium,webkit').split(',');
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const PLACEHOLDER = String.raw`lorem ipsum|dolor sit amet|\bTBD\b|\bTODO\b|\bXXX\b|your (text|title|heading) here|example\.com|555-\d{4}`;

// Send the preview bypass header to the preview host only, never to third parties
async function protect(context, url) {
  const headers = bypassHeadersFor(url);
  if (!Object.keys(headers).length) return;
  const host = new URL(url).host;
  await context.route(r => new URL(r).host === host, (route) => route.continue({ headers: { ...route.request().headers(), ...headers } }));
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

const results = [];
for (const name of browsers) {
  const browser = await engines[name].launch();
  for (const url of urls) {
    const slug = slugFor(url);
    for (const w of [...widths, 320]) {
      const reflowOnly = w === 320; // WCAG reflow: 320 CSS px is 1280 at 400% zoom; 640 is 200%
      const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 800 : 900 }, deviceScaleFactor: w < 768 ? 2 : 1, isMobile: name === 'chromium' && w < 768, hasTouch: w < 768 });
      await protect(context, url);
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      const analyticsHits = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
      page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));
      page.on('response', r => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url().slice(0, 140)}`); });
      page.on('request', r => { if (/google-analytics\.com\/(g\/)?collect|\/gtag\/js|googletagmanager\.com\/gtm\.js|plausible\.io\/api\/event|\/_vercel\/insights\/event/.test(r.url())) analyticsHits.push(r.url().split('?')[0] + (r.url().includes('en=page_view') ? ' page_view' : '')); });
      let status = null;
      try {
        const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        status = res?.status();
      } catch (e) { consoleErrors.push(`load: ${e.message.slice(0, 120)}`); }
      await scrollThrough(page);
      const data = await page.evaluate(({ src, mobile }) => {
        const vw = document.documentElement.clientWidth;
        const vh = window.innerHeight;
        const els = [...document.querySelectorAll('body *')];
        const label = el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList[0] ? '.' + el.classList[0] : ''} "${(el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
        const visible = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0; };
        const clippedAncestor = el => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/hidden|clip|auto|scroll/.test(s.overflowX)) return true; } return false; };
        // Hidden on purpose: screen-reader-only text, closed accordions, hover-swap labels
        const srOnly = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width <= 2 || r.height <= 2 || /rect\(0/.test(s.clip) || s.clipPath === 'inset(50%)'; };
        const clippedAway = el => {
          const e = el.getBoundingClientRect();
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            if (p.matches('details:not([open])')) return true;
            const s = getComputedStyle(p);
            if (s.overflow === 'visible' && s.overflowY === 'visible') continue;
            const r = p.getBoundingClientRect();
            const shownH = Math.max(0, Math.min(e.bottom, r.bottom) - Math.max(e.top, r.top));
            const shownW = Math.max(0, Math.min(e.right, r.right) - Math.max(e.left, r.left));
            if (shownH < e.height * 0.5 || shownW < e.width * 0.5) return true;
          }
          return false;
        };
        const twinVisible = el => [...el.parentElement?.parentElement?.querySelectorAll('*') || []].some(o => o !== el && o.children.length === 0 && o.innerText?.trim() === el.innerText.trim() && +getComputedStyle(o).opacity > 0.5);
        const imgs = [...document.images];
        const text = document.body.innerText;
        return {
          horizontalOverflowPx: document.documentElement.scrollWidth - vw,
          elementsPastViewport: els.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !clippedAncestor(el); }).slice(0, 8).map(label),
          stuckInvisible: els.filter(el => el.children.length === 0 && el.innerText?.trim() && visible(el) && !srOnly(el) && !clippedAway(el) && !twinVisible(el) && (() => { let o = 1; for (let p = el; p; p = p.parentElement) o *= +getComputedStyle(p).opacity; return o < 0.05; })()).slice(0, 8).map((el, i) => { el.setAttribute('data-qa-stuck', i); return label(el); }),
          textOverflowing: els.filter(el => { if (!el.innerText?.trim() || el.children.length || srOnly(el) || clippedAway(el)) return false; const s = getComputedStyle(el); return (s.overflow === 'hidden' || s.overflowY === 'hidden') && el.scrollHeight > el.clientHeight + 2 && s.webkitLineClamp === 'none'; }).slice(0, 8).map(label),
          brokenImages: imgs.filter(i => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src)).map(i => (i.currentSrc || i.src).slice(0, 140)),
          lazyAboveFold: imgs.filter(i => i.loading === 'lazy' && i.getBoundingClientRect().top < vh && i.getBoundingClientRect().width > 100).map(i => (i.currentSrc || i.src).split('?')[0].split('/').pop()),
          eagerBelowFold: mobile ? imgs.filter(i => i.loading !== 'lazy' && i.getBoundingClientRect().top > vh * 2).map(i => (i.currentSrc || i.src).split('?')[0].split('/').pop()).slice(0, 10) : [],
          oversizedImages: imgs.filter(i => i.naturalWidth > 0 && i.getBoundingClientRect().width > 0 && i.naturalWidth > i.getBoundingClientRect().width * window.devicePixelRatio * 2.2).map(i => `${(i.currentSrc || i.src).split('?')[0].split('/').pop()} ${i.naturalWidth}px shown at ${Math.round(i.getBoundingClientRect().width)}px`).slice(0, 8),
          placeholders: (text.match(new RegExp(`.{0,25}(${src}).{0,25}`, 'gi')) || []).slice(0, 10),
          emDashes: (text.match(/.{0,30}\u2014.{0,30}/g) || []).slice(0, 15),
          videos: [...document.querySelectorAll('video')].map(v => ({ src: (v.currentSrc || v.src).split('/').pop(), muted: v.muted, playsInline: v.playsInline, poster: !!v.poster, paused: v.paused })),
          renderedWords: text.split(/\s+/).filter(Boolean).length,
          smallText: mobile ? els.filter(el => el.children.length === 0 && el.innerText?.trim() && visible(el) && parseFloat(getComputedStyle(el).fontSize) < 12).slice(0, 5).map(label) : [],
        };
      }, { src: PLACEHOLDER, mobile: w < 768 });

      // Screenshot before the hover, keyboard and menu tests leave focus rings and open menus behind
      let shot = null;
      if (!args['no-shots'] && !reflowOnly) {
        fs.mkdirSync(`qa/shots/${name}`, { recursive: true });
        shot = `qa/shots/${name}/${slug}-${w}.png`;
        await page.screenshot({ path: shot, fullPage: true }).catch(() => { shot = null; });
      }
      // Invisible text that shows on hover is a hover reveal, not a stuck animation.
      // Fine with a mouse; on touch it can hide a CTA, so it is reported differently.
      data.hoverReveal = [];
      const stillStuck = [];
      for (let i = 0; i < data.stuckInvisible.length; i++) {
        const sel = `[data-qa-stuck="${i}"]`;
        let shown = false;
        // Hover the element, then its ancestors (cards usually reveal on their own :hover)
        const targets = await page.evaluate(s => {
          const out = [];
          for (let p = document.querySelector(s), n = 0; p && p !== document.body && n < 5; p = p.parentElement, n++) { p.setAttribute('data-qa-anc', `${s}-${n}`); out.push(`[data-qa-anc="${s.replace(/"/g, '\\"')}-${n}"]`); }
          return out;
        }, sel).catch(() => []);
        for (const t of targets) {
          try {
            await page.hover(t, { force: true, timeout: 2000 });
            await page.waitForTimeout(900);
            shown = await page.evaluate(s => { let o = 1; for (let p = document.querySelector(s); p; p = p.parentElement) o *= +getComputedStyle(p).opacity; return o > 0.5; }, sel);
          } catch {}
          if (shown) break;
        }
        (shown ? data.hoverReveal : stillStuck).push(data.stuckInvisible[i]);
      }
      data.stuckInvisible = stillStuck;
      await page.mouse.move(0, 0);

      // Keyboard focus: tab through the first stops and check each has a visible indicator
      let focus = null;
      if (w === 1440 && name === 'chromium') {
        focus = { stops: [], noIndicator: [] };
        for (let i = 0; i < 15; i++) {
          await page.keyboard.press('Tab');
          // Focus styles often transition (border or shadow over 0.2s), so read after they settle
          await page.waitForTimeout(400);
          const f = await page.evaluate(async () => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const read = () => { const s = getComputedStyle(el); return [s.outlineStyle !== 'none' ? s.outlineWidth + s.outlineColor : '', s.boxShadow, s.borderColor, s.backgroundColor, s.color, s.textDecorationLine].join('|'); };
            const focused = read();
            el.blur();
            await new Promise(r => setTimeout(r, 400));
            const blurred = read();
            el.focus({ focusVisible: true });
            const s = getComputedStyle(el);
            const ring = focused !== blurred || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0);
            return { label: `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.getAttribute('name') || el.getAttribute('placeholder') || '').trim().slice(0, 30)}"`, ring };
          });
          if (!f) continue;
          focus.stops.push(f.label);
          if (!f.ring) focus.noIndicator.push(f.label);
        }
        focus.skipLink = focus.stops.length ? /skip/i.test(focus.stops[0]) : false;
      }

      // Mobile menu: find the toggle, open it, check links show, then Escape
      let menu = null;
      if (w === 390 && !reflowOnly) {
        const toggle = page.locator('button[aria-expanded], button[aria-controls], [aria-label*="menu" i]').filter({ visible: true }).first();
        if (await toggle.count()) {
          try {
            await toggle.click({ timeout: 3000 });
            await page.waitForTimeout(600);
            menu = await page.evaluate(() => {
              const t = document.querySelector('button[aria-expanded], button[aria-controls], [aria-label*="menu" i]');
              const links = [...document.querySelectorAll('nav a, [role="dialog"] a')].filter(a => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < window.innerHeight; });
              return { expanded: t?.getAttribute('aria-expanded'), visibleLinks: links.length, scrollLocked: getComputedStyle(document.body).overflow === 'hidden' || getComputedStyle(document.documentElement).overflow === 'hidden' };
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            menu.closesOnEscape = await page.evaluate(() => document.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded') !== 'true');
          } catch (e) { menu = { error: e.message.slice(0, 120) }; }
        } else menu = { toggleFound: false };
      }

      // axe: Chromium at 1440 and 390
      let axe = null;
      if (name === 'chromium' && (w === 1440 || w === 390)) {
        // Text caught mid fade-in reads as low contrast, so let finite animations finish first
        await page.evaluate(() => Promise.race([
          Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))),
          new Promise(r => setTimeout(r, 4000)),
        ])).catch(() => {});
        await page.addScriptTag({ path: axePath });
        axe = await page.evaluate(async () => {
          const r = await window.axe.run(document, { resultTypes: ['violations'] });
          return r.violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 5).map(n => n.target.join(' ')) , count: v.nodes.length }));
        });
      }

      results.push({ url, browser: name, width: w, status, reflowOnly, consoleErrors: [...new Set(consoleErrors)], failedRequests: [...new Set(failedRequests)], analyticsHits, focus, menu, axe, screenshot: shot, ...data });
      await context.close();
      process.stdout.write(`\r${name} ${slug} ${w}        `);
    }
  }
  await browser.close();
}
console.log('');
writeJson('qa/scan.json', results);

// Summary, grouped so one bug on many pages is one line
const L = [];
const group = new Map();
const add = (id, sev, what, where) => { const k = `${id}|${sev}|${what}`; if (!group.has(k)) group.set(k, new Set()); group.get(k).add(where); };
for (const r of results) {
  const where = `${new URL(r.url).pathname} @${r.width} ${r.browser}`;
  if (r.horizontalOverflowPx > 1) add(r.reflowOnly ? 'J5' : 'B1', r.reflowOnly ? 'High' : 'Blocker', `Horizontal scroll ${r.horizontalOverflowPx}px; widest: ${r.elementsPastViewport.slice(0, 2).join(', ')}`, where);
  if (r.reflowOnly) continue;
  for (const e of r.stuckInvisible) add('B10', 'Blocker', `Text stuck invisible after scrolling: ${e}`, where);
  for (const e of r.hoverReveal || []) if (r.width < 1024) add('B9', 'High', `Shows only on hover, so touch users may never see it: ${e}`, where);
  for (const e of r.textOverflowing) add('B2', 'Blocker', `Text clipped by its box: ${e}`, where);
  for (const e of r.consoleErrors) add('B18', 'High', `Console error: ${e}`, where);
  for (const e of r.failedRequests) add('B18', 'High', `Request failed: ${e}`, where);
  for (const e of r.brokenImages) add('B6', 'Blocker', `Broken image: ${e}`, where);
  for (const e of r.lazyAboveFold) add('I7', 'High', `Lazy-loaded image in the first screen (slows LCP): ${e}`, where);
  if (r.eagerBelowFold?.length) add('I7', 'Polish', `${r.eagerBelowFold.length} image(s) far below the fold are not lazy`, where);
  for (const e of r.oversizedImages) add('I7', 'Polish', `Image much larger than shown: ${e}`, where);
  for (const e of r.smallText || []) add('J2', 'Polish', `Text under 12px on mobile: ${e}`, where);
  for (const v of r.videos) if (!v.muted || !v.playsInline || !v.poster) add('I6', 'High', `Video ${v.src}: ${[!v.muted && 'not muted', !v.playsInline && 'no playsinline', !v.poster && 'no poster'].filter(Boolean).join(', ')}`, where);
  if (r.focus?.noIndicator.length) add('J3', 'High', `No visible focus indicator on: ${r.focus.noIndicator.slice(0, 4).join(', ')}`, where);
  if (r.focus && !r.focus.skipLink) add('J3', 'Polish', 'No skip link as the first tab stop', where);
  if (r.menu?.toggleFound === false) add('B7', 'Check', 'No mobile menu toggle found; check the nav by hand', where);
  if (r.menu?.error) add('B7', 'Check', `Mobile menu test failed: ${r.menu.error}`, where);
  if (r.menu && r.menu.visibleLinks === 0) add('B7', 'Blocker', 'Mobile menu opened but no links are visible', where);
  if (r.menu && r.menu.expanded && r.menu.expanded !== 'true') add('B7', 'High', 'Menu toggle does not set aria-expanded="true" when open', where);
  if (r.menu && r.menu.closesOnEscape === false) add('J3', 'High', 'Mobile menu does not close on Escape', where);
  if (r.menu && r.menu.visibleLinks && r.menu.scrollLocked === false) add('B7', 'Polish', 'Page behind the open mobile menu still scrolls (check by hand; fine if the menu covers the screen)', where);
  for (const v of r.axe || []) add('J1', v.impact === 'critical' ? 'Blocker' : 'High', `axe ${v.impact}: ${v.id} (${v.help}), ${v.count} element(s), e.g. ${v.nodes[0]}`, where);
  if (r.browser === 'chromium' && r.width === 1440) {
    const pv = r.analyticsHits.filter(h => h.includes('page_view')).length;
    if (pv > 1) add('K1', 'High', `${pv} page_view hits on one load`, where);
  }
}
for (const [k, wheres] of group) {
  const [id, sev, what] = k.split('|');
  const list = [...wheres];
  L.push(`- **${id}** (${sev}) ${what}. ${list.length > 4 ? `${list.length} places, e.g. ${list.slice(0, 3).join('; ')}` : list.join('; ')}`);
}
// G1: text that only exists after JavaScript runs is invisible to AI crawlers
const seo = (() => { try { return JSON.parse(fs.readFileSync('qa/seo.json', 'utf8')); } catch { return null; } })();
if (seo) for (const r of results.filter(r => r.browser === 'chromium' && r.width === 1440)) {
  const raw = seo.pages.find(p => p.path === new URL(r.url).pathname);
  if (raw?.wordCount && r.renderedWords > raw.wordCount * 1.3 + 30) L.push(`- **G1** (Blocker) ${new URL(r.url).pathname}: ${r.renderedWords} words after JavaScript, ${raw.wordCount} in the server HTML. AI crawlers only see the server HTML`);
}
const analytics = results.filter(r => r.browser === 'chromium' && r.width === 1440).map(r => `${new URL(r.url).pathname}: ${r.analyticsHits.length ? r.analyticsHits.join(', ') : 'none'}`);
fs.writeFileSync('qa/scan-summary.md', `# Browser scan\n\n${urls.length} pages x ${widths.length} widths (+320 reflow) x ${browsers.join(', ')}. ${new Date().toISOString().slice(0, 16)}\n\nCandidates; check each. Screenshots in qa/shots/ still need a visual review.\n\n${L.join('\n') || '- Nothing flagged'}\n\n## Analytics requests seen (Chromium 1440)\n\n${analytics.join('\n')}\n`);
console.log(`Scan done: ${results.length} page loads, ${L.length} flag groups. See qa/scan-summary.md`);
