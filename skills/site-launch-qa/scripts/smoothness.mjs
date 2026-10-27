// Lightness and smoothness (I11 to I18). For each page and width, in real Chrome with the GPU
// on (a visible window, because headless Chrome draws frames differently):
//   1. scrolls top to bottom with wheel input, times every frame, and blames each slow frame on
//      what happened at that moment (a script, a video starting, an image, a script arriving)
//   2. weighs the page: our own JS, CSS and fonts, third-party JS by host, before and after scrolling
//   3. checks the page does nothing while it sits still (style recalcs, endless animations)
//   4. flags stacked copies of large images (a progressive blur built from many full-size layers)
//
// Usage (from the repo root):
//   node qa/tools/smoothness.mjs qa/key-pages.txt                    preview or production URLs
//   node qa/tools/smoothness.mjs https://<domain>/ --serve <built folder> --as https://<domain>
//        serves a local production build under the real domain, so tracking that only loads on
//        the production hostname is on (build it with the production env first)
// Options: --widths 1440,390   --hz 120 (the gate assumes this screen)   --ad-paths /go,/lp
//          (pages allowed to load tracking right away)   --js-budget 100 --css-budget 75
//          --font-budget 250 --initial-budget 1500 (KB, compressed)
// Reporting beacons (Meta, GoHighLevel, GA4, Vercel) are blocked so tests add no fake visits;
// the scripts themselves still load. Keep the Chrome window uncovered while it runs: a covered or
// minimized window is throttled and its numbers mean nothing (same for a hidden Claude Browser pane).
// Budgets cover our own files; third-party JS is listed by host, other third-party files as one total.
// Writes qa/smoothness.json and qa/smoothness-summary.md.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadEnv, parseArgs, readLines, writeJson, bypassHeadersFor } from './lib.mjs';

loadEnv();
const args = parseArgs();
const target = args._[0] || 'qa/key-pages.txt';
const urls = /^https?:/.test(target) ? [target] : readLines(target);
const widths = String(args.widths || '1440,390').split(',').map(Number);
const hz = +(args.hz || 120);
const adPaths = String(args['ad-paths'] || '/go').split(',').filter(Boolean);
const budget = { js: +(args['js-budget'] || 100), css: +(args['css-budget'] || 75), font: +(args['font-budget'] || 250), initial: +(args['initial-budget'] || 1500) };
const serveDir = args.serve ? path.resolve(args.serve) : null;
const servedAs = args.as ? new URL(args.as).origin : null;

// Requests that report a visit. Blocked, so nothing fake reaches the client's ad or CRM data.
const BEACON = /facebook\.com\/tr|leadconnectorhq\.com\/external-tracking\/events|google-analytics\.com\/(g\/)?collect|analytics\.google\.com\/g\/collect|\/_vercel\/(insights\/(view|event)|speed-insights\/vitals)|clarity\.ms\/collect|plausible\.io\/api\/event/;

// Instruments the page before any of its own code runs
const instrument = () => {
  const sm = (window.__sm = { raf: [], loaf: [], events: [], res: [], scroll: [] });
  const tick = (t) => { sm.raf.push(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) sm.loaf.push({ start: e.startTime, dur: e.duration, scripts: (e.scripts || []).map((s) => ({ src: s.sourceURL, fn: s.sourceFunctionName, invoker: s.invoker, dur: s.duration })) });
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch {}
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) sm.res.push({ name: e.name, type: e.initiatorType, end: e.responseEnd });
  }).observe({ type: 'resource', buffered: true });
  document.addEventListener('playing', (e) => sm.events.push({ t: performance.now(), what: 'a video started playing', src: e.target.currentSrc }), true);
  document.addEventListener('load', (e) => { if (e.target.tagName === 'IMG') sm.events.push({ t: performance.now(), what: 'an image loaded', src: e.target.currentSrc }); }, true);
  addEventListener('scroll', () => sm.scroll.push([performance.now(), scrollY]), { passive: true });
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) if (n.tagName === 'SCRIPT' || n.tagName === 'IFRAME') sm.events.push({ t: performance.now(), what: `a ${n.tagName.toLowerCase()} was added`, src: n.src || 'inline' });
  }).observe(document, { childList: true, subtree: true });
};

// Large images drawn more than twice in the same place (one sharp plus one blurred copy is fine)
const stackedImages = () => {
  const vw = innerWidth, vh = innerHeight, min = vw * vh * 0.25;
  const items = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width * r.height < min) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    let src = el.tagName === 'IMG' ? el.currentSrc || el.src : (s.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1];
    if (!src) continue;
    items.push({ key: src.split('?')[0], x: r.left, y: r.top + scrollY, w: r.width, h: r.height, filter: s.filter !== 'none' || s.backdropFilter !== 'none' });
  }
  const groups = [];
  for (const it of items) {
    const g = groups.find((g) => g.key === it.key && Math.abs(g.x - it.x) < 4 && Math.abs(g.y - it.y) < 4 && Math.abs(g.w - it.w) < 4);
    if (g) { g.count++; g.filtered += it.filter; } else groups.push({ ...it, count: 1, filtered: +it.filter });
  }
  return groups.filter((g) => g.count > 2).map((g) => ({ image: g.key.split('/').pop().slice(0, 60), copies: g.count, blurred: g.filtered, at: `${Math.round(g.w)}x${Math.round(g.h)} at y=${Math.round(g.y)}` }));
};

const host = (u) => { try { return new URL(u).host; } catch { return u.slice(0, 40); } };
const kb = (b) => Math.round(b / 1024);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const contentType = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', woff2: 'font/woff2', woff: 'font/woff', mp4: 'video/mp4', webm: 'video/webm', txt: 'text/plain', xml: 'application/xml', json: 'application/json', ico: 'image/x-icon', webmanifest: 'application/manifest+json' };
function serveFile(route) {
  const url = new URL(route.request().url());
  const clean = decodeURIComponent(url.pathname).replace(/\/$/, '');
  const file = [`${serveDir}${clean}`, `${serveDir}${clean}/index.html`, `${serveDir}${clean}.html`].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) {
    const nf = path.join(serveDir, '404.html');
    return route.fulfill({ status: 404, contentType: 'text/html', body: fs.existsSync(nf) ? fs.readFileSync(nf) : 'not found' });
  }
  const ext = file.split('.').pop().toLowerCase();
  return route.fulfill({ status: 200, contentType: contentType[ext] || 'application/octet-stream', body: fs.readFileSync(file) });
}

let browser, engineNote = 'Google Chrome, visible window, GPU on';
try {
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
} catch {
  browser = await chromium.launch({ headless: false });
  engineNote = 'Playwright Chromium (Google Chrome not found: install it for numbers you can trust)';
}

// One page at one width: scroll, weigh, idle check, stacked images
async function measure(url, width, isAdPage) {
  const height = width < 800 ? 844 : 900;
  const ctx = await browser.newContext({ viewport: { width, height } });
  const pageOrigin = new URL(url).origin;
  const h = bypassHeadersFor(url);
  if (Object.keys(h).length) await ctx.request.get(url, { headers: { ...h, 'x-vercel-set-bypass-cookie': 'true' }, maxRedirects: 0 }).catch(() => {});
  await ctx.route(BEACON, (r) => r.fulfill({ status: 204, body: '' }));
  if (serveDir && servedAs) await ctx.route((u) => u.origin === servedAs && !/^\/_vercel\//.test(u.pathname), serveFile);
  await ctx.addInitScript(instrument);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Performance.enable');
  const reqs = new Map();
  let snapshotAt = null;
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0, early: snapshotAt === null }));
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.type = e.type; });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });

  const row = { url, width, problems: [] };
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await sleep(600);
    snapshotAt = Date.now();

    // 1. Scroll with the wheel, the way a visitor with a mouse or trackpad does
    await page.mouse.move(width / 2, height / 2);
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const steps = Math.min(+(args.steps || 600), Math.max(60, Math.ceil(pageHeight / 45) + 20));
    const t0 = await page.evaluate(() => performance.now());
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, 45); await sleep(16); }
    await sleep(1500);
    const sm = await page.evaluate(() => window.__sm);
    const moves = sm.scroll.filter(([t]) => t >= t0);
    const tEnd = moves.length ? moves[moves.length - 1][0] : t0;
    const frames = sm.raf.filter((t) => t >= t0 && t <= tEnd);
    const gaps = frames.slice(1).map((t, i) => ({ start: frames[i], end: t, ms: t - frames[i] })).slice(5);
    const sorted = gaps.map((g) => g.ms).sort((a, b) => a - b);
    const typical = sorted[Math.floor(sorted.length / 2)] || 1000 / hz;
    const screenHz = Math.round(1000 / typical);
    const limit = 1.5 * (1000 / Math.max(hz, screenHz));
    const slow = gaps.filter((g) => g.ms > limit);
    const blame = (g) => {
      const why = [];
      for (const l of sm.loaf) if (l.start < g.end && l.start + l.dur > g.start) {
        if (l.scripts.length) for (const s of l.scripts) why.push(`script ${host(s.src) || 'inline'}${s.fn ? ' ' + s.fn : ''} (${s.invoker}) ${Math.round(s.dur)}ms`);
        else why.push(`style, layout or paint ${Math.round(l.dur)}ms`);
      }
      for (const e of sm.events) if (e.t >= g.start - 100 && e.t <= g.end) why.push(`${e.what}: ${host(e.src) === new URL(url).host ? new URL(e.src).pathname.slice(-50) : host(e.src)}`);
      for (const r of sm.res) if (r.end >= g.start - 50 && r.end <= g.end && /script|iframe|link/.test(r.type)) why.push(`a ${r.type} finished downloading: ${host(r.name)}`);
      return why.length ? [...new Set(why)] : ['nothing on the page thread (likely GPU, raster or decode work)'];
    };
    row.smooth = {
      screenHz, limitMs: +limit.toFixed(1), frames: gaps.length, slow: slow.length,
      worstMs: Math.round(Math.max(0, ...gaps.map((g) => g.ms))),
      p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] || 0),
      scrolledPx: Math.round(moves.length ? moves[moves.length - 1][1] : 0),
      slowFrames: slow.slice(0, 20).map((g) => ({ atMs: Math.round(g.start - t0), ms: Math.round(g.ms), causes: blame(g) })),
    };
    if (gaps.length < 30) row.problems.push('I11: too few frames recorded to judge (was the window covered or the page too short to scroll?)');
    else if (slow.length) row.problems.push(`I11: ${slow.length} frame${slow.length > 1 ? 's' : ''} over ${limit.toFixed(1)}ms while scrolling (worst ${row.smooth.worstMs}ms)`);
    if (screenHz < 100) row.smooth.note = `This screen runs at about ${screenHz}Hz, so the gate was ${limit.toFixed(1)}ms; on a 120Hz screen it is 12.5ms`;

    // 3. Idle: nothing should keep working while the page sits still, at the bottom and the top
    row.idle = [];
    for (const where of ['bottom', 'top']) {
      if (where === 'top') { await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await sleep(1500); }
      const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      await sleep(3000);
      const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      const running = await page.evaluate(() => [...new Set(document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).map((a) => `${a.animationName || 'animation'} on .${String(a.effect.target?.className?.baseVal ?? a.effect.target?.className ?? '').split(' ')[0]}`))]);
      const recalcs = Math.round(m1.RecalcStyleCount - m0.RecalcStyleCount);
      row.idle.push({ where, recalcsIn3s: recalcs, taskMs: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000), endless: running });
      if (recalcs > 20) row.problems.push(`I18: ${recalcs} style recalcs in 3s while idle at the ${where}${running.length ? ` (running: ${running.join(', ')})` : ''}`);
    }

    // 4. Stacked copies of large images
    row.stacked = await page.evaluate(stackedImages);
    for (const s of row.stacked) row.problems.push(`I17: ${s.copies} copies of ${s.image} drawn in one place (${s.at})`);

    // 2. Weight, compressed, split into our own files and third parties
    const own = (u) => { try { const x = new URL(u); return (x.origin === pageOrigin || x.origin === servedAs) && !x.pathname.startsWith('/_vercel/'); } catch { return false; } };
    const sum = (list) => list.reduce((a, r) => a + r.bytes, 0);
    const all = [...reqs.values()].filter((r) => !/^data:|^blob:/.test(r.url));
    const scripts = all.filter((r) => r.type === 'Script');
    const thirdJs = {};
    for (const r of scripts.filter((r) => !own(r.url))) thirdJs[host(r.url)] = (thirdJs[host(r.url)] || 0) + r.bytes;
    const early3p = scripts.filter((r) => r.early && !own(r.url));
    row.weight = {
      initialKB: kb(sum(all.filter((r) => r.early))),
      totalKB: kb(sum(all)),
      ownJsKB: kb(sum(scripts.filter((r) => own(r.url)))),
      cssKB: kb(sum(all.filter((r) => r.type === 'Stylesheet' && own(r.url)))),
      fontKB: kb(sum(all.filter((r) => r.type === 'Font' && own(r.url)))),
      thirdPartyOtherKB: kb(sum(all.filter((r) => !own(r.url) && r.type !== 'Script' && !/Image|Media/.test(r.type)))),
      imageKB: kb(sum(all.filter((r) => r.type === 'Image'))),
      mediaKB: kb(sum(all.filter((r) => r.type === 'Media'))),
      thirdPartyJsKB: Object.fromEntries(Object.entries(thirdJs).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, kb(v)])),
      thirdPartyJsBeforeScrollKB: kb(sum(early3p)),
    };
    const w = row.weight;
    if (w.ownJsKB > budget.js) row.problems.push(`I16: our own JS is ${w.ownJsKB}KB (budget ${budget.js}KB)`);
    if (w.cssKB > budget.css) row.problems.push(`I16: CSS is ${w.cssKB}KB (budget ${budget.css}KB)`);
    if (w.fontKB > budget.font) row.problems.push(`I16: fonts are ${w.fontKB}KB (budget ${budget.font}KB)`);
    if (w.initialKB > budget.initial) row.problems.push(`I16: ${w.initialKB}KB loads before the visitor scrolls (budget ${budget.initial}KB)`);
    if (!isAdPage && w.thirdPartyJsBeforeScrollKB > 20) row.problems.push(`I14: ${w.thirdPartyJsBeforeScrollKB}KB of third-party JS loads with the page (${[...new Set(early3p.map((r) => host(r.url)))].join(', ')}); it should wait for a scroll pause`);
  } catch (e) {
    row.problems.push(`could not test: ${e.message.split('\n')[0]}`);
  }
  await ctx.close();
  return row;
}

const results = [];
for (const url of urls) {
  const pathName = new URL(url).pathname;
  const isAdPage = adPaths.some((p) => pathName === p || pathName.startsWith(p.replace(/\/?$/, '/')));
  for (const width of widths) {
    const row = await measure(url, width, isAdPage);
    // A slow frame can come from the Mac itself (another app, the first launch). Run the page
    // again: it fails only if slow frames come back.
    if (row.smooth?.slow) {
      const again = await measure(url, width, isAdPage);
      if (again.smooth && !again.smooth.slow) {
        row.problems = row.problems.filter((p) => !p.startsWith('I11: ') || p.startsWith('I11: too few'));
        row.smooth.note = [row.smooth.note, `${row.smooth.slow} slow frame${row.smooth.slow > 1 ? 's' : ''} on the first run did not come back on a second run, so they were left out (likely the machine)`].filter(Boolean).join('. ');
      } else if (again.smooth) row.smooth.note = [row.smooth.note, `slow frames came back on a second run (${again.smooth.slow}, worst ${again.smooth.worstMs}ms)`].filter(Boolean).join('. ');
    }
    results.push(row);
    console.log(`${url} @${width}: ${row.smooth ? `${row.smooth.slow}/${row.smooth.frames} slow frames (worst ${row.smooth.worstMs}ms, ${row.smooth.screenHz}Hz)` : 'not measured'}, own JS ${row.weight?.ownJsKB ?? '?'}KB, third-party JS ${Object.values(row.weight?.thirdPartyJsKB || {}).reduce((a, b) => a + b, 0)}KB, idle recalcs ${row.idle?.map((i) => i.recalcsIn3s).join('/') ?? '?'}${row.problems.length ? ' | ' + row.problems.join(' | ') : ''}`);
  }
}
await browser.close();

writeJson('qa/smoothness.json', { engine: engineNote, hz, servedAs, results });
const lines = [
  `# Lightness and smoothness`,
  ``,
  `${engineNote}. Wheel scroll top to bottom in 45px steps; the first 5 frames and everything after the scroll stops are left out. Gate: no frame over 1.5 refreshes while scrolling (12.5ms on a 120Hz screen). Weights are compressed transfer sizes; reporting beacons were blocked.${servedAs ? ` Local build served as ${servedAs}, so production-only tracking was on.` : ''}`,
  ``,
  `| Page | Width | Slow frames | Worst | Own JS | CSS | Fonts | Third-party JS | Before scroll | Idle recalcs (bottom/top) | Result |`,
  `|---|---|---|---|---|---|---|---|---|---|---|`,
  ...results.map((r) => `| ${new URL(r.url).pathname} | ${r.width} | ${r.smooth ? `${r.smooth.slow} of ${r.smooth.frames}` : '-'} | ${r.smooth ? r.smooth.worstMs + 'ms' : '-'} | ${r.weight?.ownJsKB ?? '-'}KB | ${r.weight?.cssKB ?? '-'}KB | ${r.weight?.fontKB ?? '-'}KB | ${r.weight ? Object.entries(r.weight.thirdPartyJsKB).map(([k, v]) => `${k} ${v}KB`).join(', ') || 'none' : '-'} | ${r.weight?.initialKB ?? '-'}KB | ${r.idle?.map((i) => i.recalcsIn3s).join(' / ') ?? '-'} | ${r.problems.length ? 'FAIL' : 'PASS'} |`),
  ``,
  `## What to fix`,
  ``,
  ...(results.some((r) => r.problems.length) ? results.filter((r) => r.problems.length).flatMap((r) => [
    `### ${new URL(r.url).pathname} @${r.width}`,
    ...r.problems.map((p) => `- ${p}`),
    ...(r.smooth?.note ? [`- Note: ${r.smooth.note}`] : []),
    ...(r.smooth?.slowFrames.length ? [`- Slow frames (time into the scroll, length, what happened then):`, ...r.smooth.slowFrames.map((f) => `  - ${f.atMs}ms: ${f.ms}ms, ${f.causes.join('; ')}`)] : []),
    ``,
  ]) : ['Nothing: every page passes.']),
];
fs.writeFileSync('qa/smoothness-summary.md', lines.join('\n') + '\n');
console.log('\nWrote qa/smoothness-summary.md and qa/smoothness.json');
