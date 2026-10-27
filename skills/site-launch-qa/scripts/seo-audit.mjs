// Crawl a site the way a search or AI crawler sees it: raw HTML, no JavaScript.
// Usage: node qa/tools/seo-audit.mjs --origin <url being tested> --prod <https://production-domain> [--inputs qa/launch-inputs.json] [--max 400] [--no-external]
// Writes qa/seo.json (everything), qa/urls.txt (pages for the browser scan) and qa/seo-summary.md.
import fs from 'node:fs';
import { loadEnv, parseArgs, get, trace, sitemapUrls, rebase, writeJson, readJson, pool, decode, imageSize, UA, bypassHeadersFor } from './lib.mjs';

loadEnv();
const args = parseArgs();
if (!args.origin) { console.error('Need --origin'); process.exit(1); }
const origin = new URL(args.origin).origin;
const prod = new URL(args.prod || args.origin).origin;
const inputs = readJson(args.inputs || 'qa/launch-inputs.json', {});
const MAX = +(args.max || 400);
const isPreview = origin !== prod;

const PLACEHOLDER = /lorem ipsum|dolor sit amet|\bTBD\b|\bTODO\b|\bFIXME\b|\bXXX\b|your (text|title|heading|name) here|placeholder|sample (text|project|home)|example\.com|\(555\)|555-\d{4}|123 main st/i;
const STAGING = /\.vercel\.app|localhost|127\.0\.0\.1|\.framer\.(app|website)|framer\.com\/projects|webflow\.io|squarespace\.com\/config|-editor\./i;

// ---------- small HTML helpers (regex based; good enough for server-rendered Astro output)
const attrs = tag => {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
};
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(m => attrs(m[0].slice(name.length + 1)));
const meta = (html, key) => {
  for (const t of tags(html, 'meta')) if ((t.name || t.property || '').toLowerCase() === key) return t.content ?? '';
  return null;
};
const stripTags = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const visibleText = html => stripTags(html
  .replace(/<head[\s\S]*?<\/head>/i, ' ')
  .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' '));
const context = (text, re, n = 30) => [...text.matchAll(new RegExp(`.{0,${n}}(${re.source}).{0,${n}}`, 'gi'))].map(m => m[0].trim());

const sameSite = (href, base = origin) => {
  try { const u = new URL(href, base); return u.origin === origin || u.origin === prod || u.host === new URL(prod).host.replace(/^www\./, ''); } catch { return false; }
};
const toTested = (href, base = origin) => { const u = new URL(href, base); u.hash = ''; return rebase(u.href, origin); };
const pathOf = href => new URL(href).pathname;

// ---------- pages
const sm = await sitemapUrls(origin);
const sitemapPaths = new Set(sm.urls.map(u => new URL(u).pathname));
const queue = [origin + '/', ...sm.urls.map(u => rebase(u, origin))];
const seen = new Set();
const pages = [];
const cssCache = new Map();

async function auditPage(url) {
  const t = await trace(url);
  const r = { url, path: pathOf(url), status: t.status, hops: t.hops.length - 1, finalUrl: t.final, inSitemap: sitemapPaths.has(pathOf(url)) };
  if (t.status !== 200 || !t.body) return r;
  const html = t.body;
  const headTxt = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  const text = visibleText(html);
  const robotsMeta = meta(html, 'robots');
  const xRobots = t.headers['x-robots-tag'] || null;
  // On a preview, Vercel's X-Robots-Tag: noindex covers every page and goes away in production,
  // so only a noindex in the page itself counts there
  r.noindex = /noindex/i.test(robotsMeta || '') || (!isPreview && /noindex/i.test(xRobots || ''));
  r.previewNoindexHeader = isPreview && /noindex/i.test(xRobots || '');
  r.xRobotsTag = xRobots;
  r.metaRobots = robotsMeta;
  r.title = stripTags((headTxt.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]);
  r.titleLength = r.title.length;
  r.description = meta(html, 'description');
  r.descriptionLength = r.description?.length ?? 0;
  const canon = tags(headTxt, 'link').find(l => (l.rel || '').toLowerCase() === 'canonical');
  r.canonical = canon?.href || null;
  r.lang = (html.match(/<html[^>]*\blang=["']?([^"'\s>]+)/i) || [])[1] || null;
  r.viewport = meta(html, 'viewport');
  r.og = Object.fromEntries(['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name', 'og:image:width', 'og:image:height', 'og:image:alt'].map(k => [k, meta(html, k)]));
  r.twitter = Object.fromEntries(['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].map(k => [k, meta(html, k)]));
  r.headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => ({ level: +m[1], text: stripTags(m[2]).slice(0, 90) }));
  r.h1s = r.headings.filter(h => h.level === 1).map(h => h.text);
  r.headingSkips = r.headings.slice(1).map((h, i) => [r.headings[i], h]).filter(([a, b]) => b.level > a.level + 1).map(([a, b]) => `h${a.level} "${a.text}" -> h${b.level} "${b.text}"`);
  r.wordCount = text.split(/\s+/).filter(Boolean).length;
  r.text = text;
  r.emDashes = context(text, /\u2014|\u2013(?=\s)/);
  r.emDashesInMeta = [...new Set([r.title, r.description, r.og['og:title'], r.og['og:description']])].filter(s => s && /\u2014/.test(s));
  r.placeholders = context(text, PLACEHOLDER).slice(0, 10);
  r.jsonld = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => {
    try { return { ok: true, data: JSON.parse(m[1]) }; } catch (e) { return { ok: false, error: e.message, raw: m[1].slice(0, 300) }; }
  });
  r.faqQuestions = [
    ...[...html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)].map(m => stripTags(m[1])),
    ...r.headings.filter(h => h.text.endsWith('?')).map(h => h.text),
  ];
  r.visibleBreadcrumb = /aria-label=["'][^"']*breadcrumb/i.test(html);
  // links
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(m => ({ ...attrs(m[1]), text: stripTags(m[2]).slice(0, 60) }));
  r.links = { internal: [], external: [], tel: [], mailto: [], empty: [], staging: [] };
  for (const a of anchors) {
    const href = a.href;
    if (href === undefined || href === '' || href === '#') { r.links.empty.push(a.text || a['aria-label'] || '(no text)'); continue; }
    if (href.startsWith('tel:')) { r.links.tel.push(href); continue; }
    if (href.startsWith('mailto:')) { r.links.mailto.push(href); continue; }
    if (/^(javascript|data):/i.test(href)) { r.links.empty.push(href); continue; }
    if (href.startsWith('#')) continue;
    if (STAGING.test(href) && !href.startsWith(origin)) r.links.staging.push(href);
    if (sameSite(href, url)) r.links.internal.push({ href, target: toTested(href, url), text: a.text, nofollow: /nofollow/.test(a.rel || '') });
    else if (/^https?:/i.test(href)) r.links.external.push({ href, text: a.text, newTab: a.target === '_blank', rel: a.rel || '' });
  }
  // images and video
  r.images = tags(html, 'img').map(i => ({ src: i.src || i['data-src'] || '', alt: i.alt, hasAlt: 'alt' in i, loading: i.loading || null, fetchpriority: i.fetchpriority || null, width: i.width || null, height: i.height || null, srcset: !!i.srcset, decoding: i.decoding || null }));
  r.videos = [...html.matchAll(/<video\b[^>]*>/gi)].map(m => { const v = attrs(m[0].slice(6)); return { src: v.src || null, muted: 'muted' in v, playsinline: 'playsinline' in v, autoplay: 'autoplay' in v, poster: v.poster || null, preload: v.preload || null }; });
  r.iframes = tags(html, 'iframe').map(f => ({ src: f.src, loading: f.loading || null, title: f.title || null }));
  // fonts and third parties
  r.fontPreloads = tags(headTxt, 'link').filter(l => l.rel === 'preload' && l.as === 'font').map(l => l.href);
  r.stylesheets = tags(headTxt, 'link').filter(l => (l.rel || '').includes('stylesheet')).map(l => l.href);
  r.scripts = tags(html, 'script').filter(s => s.src).map(s => s.src);
  r.thirdPartyHosts = [...new Set([...r.scripts, ...r.stylesheets, ...r.iframes.map(f => f.src)].filter(Boolean).map(s => { try { return new URL(s, origin).host; } catch { return null; } }).filter(h => h && !sameSite('https://' + h)))];
  let fontCss = (html.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');
  for (const href of r.stylesheets) {
    const abs = new URL(href, origin).href;
    if (!cssCache.has(abs)) cssCache.set(abs, sameSite(abs) ? (await get(abs).catch(() => ({ body: '' }))).body : `/* external ${abs} */`);
    fontCss += cssCache.get(abs);
  }
  r.fontFaces = [...fontCss.matchAll(/@font-face\s*{[^}]*}/g)].map(m => ({
    url: (m[0].match(/url\(([^)]+)\)/) || [])[1]?.replace(/["']/g, ''),
    display: (m[0].match(/font-display:\s*([a-z]+)/) || [])[1] || null,
  }));
  r.externalFontCss = r.stylesheets.filter(s => /fonts\.googleapis|use\.typekit|fonts\.bunny/.test(s));
  return r;
}

while (queue.length && pages.length < MAX) {
  const url = queue.shift();
  const key = pathOf(url).replace(/\/+$/, '') || '/';
  if (seen.has(key)) continue;
  seen.add(key);
  const p = await auditPage(url).catch(e => ({ url, path: pathOf(url), error: e.message }));
  pages.push(p);
  for (const l of p.links?.internal || []) {
    const tp = pathOf(l.target);
    if (/\.(pdf|jpg|jpeg|png|webp|avif|gif|svg|xml|txt|zip|mp4)$/i.test(tp)) continue;
    if (!seen.has(tp.replace(/\/+$/, '') || '/')) queue.push(l.target);
  }
  process.stdout.write(`\r${pages.length} pages`);
}
console.log('');

// ---------- site level
const ok = pages.filter(p => p.status === 200 && p.title !== undefined);
const indexable = ok.filter(p => !p.noindex && (!p.canonical || pathOf(new URL(p.canonical, origin).href).replace(/\/+$/, '') === p.path.replace(/\/+$/, '')));

const dupes = field => {
  const map = {};
  for (const p of indexable) if (p[field]) (map[p[field]] ||= []).push(p.path);
  return Object.entries(map).filter(([, v]) => v.length > 1).map(([value, paths]) => ({ value, paths }));
};

const inbound = {};
for (const p of ok) for (const l of p.links.internal) {
  const tp = pathOf(l.target).replace(/\/+$/, '') || '/';
  if (tp === (p.path.replace(/\/+$/, '') || '/')) continue;
  (inbound[tp] ||= new Set()).add(p.path);
}

// trailing slash style, from canonicals
const canonPaths = indexable.map(p => p.canonical && pathOf(new URL(p.canonical, origin).href)).filter(c => c && c !== '/');
const slashStyle = canonPaths.length ? (canonPaths.every(c => c.endsWith('/')) ? 'always' : canonPaths.every(c => !c.endsWith('/')) ? 'never' : 'mixed') : 'unknown';
const offStyleLinks = [];
for (const p of ok) for (const l of p.links.internal) {
  const tp = pathOf(l.target);
  if (tp === '/' || /\.[a-z0-9]{2,5}$/i.test(tp)) continue;
  if ((slashStyle === 'never' && tp.endsWith('/')) || (slashStyle === 'always' && !tp.endsWith('/'))) offStyleLinks.push({ page: p.path, href: l.href });
}
let slashVariant = null;
const sample = indexable.find(p => p.path !== '/');
if (sample) {
  const alt = sample.path.endsWith('/') ? sample.path.replace(/\/+$/, '') : sample.path + '/';
  const t = await trace(origin + alt);
  slashVariant = { tested: alt, hops: t.hops.map(h => `${h.status} ${h.location || ''}`.trim()), final: pathOf(t.final), status: t.status };
}

// link status: every unique internal target, then external
const internalTargets = [...new Set(ok.flatMap(p => p.links.internal.map(l => l.target)))];
const internalStatus = Object.fromEntries(await pool(internalTargets, 6, async u => {
  const t = await trace(u).catch(e => ({ status: e.message, hops: [] }));
  return [u, { status: t.status, hops: Math.max(0, t.hops.length - 1), final: t.final }];
}));
const brokenInternal = [];
const redirectedInternal = [];
for (const p of ok) for (const l of p.links.internal) {
  const s = internalStatus[l.target];
  if (!s) continue;
  if (s.status !== 200) brokenInternal.push({ page: p.path, href: l.href, text: l.text, status: s.status });
  else if (s.hops > 0) redirectedInternal.push({ page: p.path, href: l.href, to: pathOf(s.final) });
}
let externalStatus = {};
if (!args['no-external']) {
  const ext = [...new Set(ok.flatMap(p => p.links.external.map(l => l.href)))];
  externalStatus = Object.fromEntries(await pool(ext, 4, async u => {
    try {
      let res = await fetch(u, { method: 'HEAD', redirect: 'follow', headers: { 'user-agent': UA.chrome }, signal: AbortSignal.timeout(20000) });
      if (res.status >= 400) res = await fetch(u, { method: 'GET', redirect: 'follow', headers: { 'user-agent': UA.chrome }, signal: AbortSignal.timeout(20000) });
      return [u, res.status];
    } catch (e) { return [u, `error: ${e.cause?.code || e.message}`]; }
  }));
}
// 403, 429 and 999 usually mean bot protection (LinkedIn, Facebook, Houzz), not a dead link
const brokenExternal = [];
const unverifiedExternal = [];
for (const p of ok) for (const l of p.links.external) {
  const s = externalStatus[l.href];
  if (s === undefined || s === 200) continue;
  const entry = { page: p.path, href: l.href, text: l.text, status: s };
  const social = /(^|\.)(facebook|instagram|linkedin|houzz|x|twitter|tiktok|pinterest|yelp|nextdoor|youtube)\.com$/.test(new URL(l.href).host);
  if ([401, 403, 405, 429, 999].includes(s) || (social && typeof s === 'number' && s >= 400) || String(s).startsWith('error: UND_ERR')) unverifiedExternal.push(entry);
  else if (typeof s !== 'number' || s >= 400) brokenExternal.push(entry);
}

// share images: size of every unique og:image
const ogImages = [...new Set(ok.map(p => p.og['og:image']).filter(Boolean))];
const ogSizes = Object.fromEntries(await pool(ogImages, 4, async u => {
  try {
    // Before launch the production domain does not serve this site yet, so load the share
    // image from the host being tested
    const src = new URL(u, origin);
    const at = src.origin === prod ? rebase(src.href, origin) : src.href;
    const res = await fetch(at, { headers: { 'user-agent': UA.chrome, ...bypassHeadersFor(at) }, signal: AbortSignal.timeout(20000) });
    const buf = Buffer.from(await res.arrayBuffer());
    return [u, { status: res.status, bytes: buf.length, ...imageSize(buf) }];
  } catch (e) { return [u, { error: e.message }]; }
}));

// robots.txt, llms.txt, 404, AI crawler access
const robots = await get(origin + '/robots.txt').catch(() => ({ status: 'error', body: '' }));
const robotsGroups = [];
let group = null;
for (const raw of (robots.body || '').split('\n')) {
  const line = raw.replace(/#.*/, '').trim();
  const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
  if (!m) continue;
  const [, k, v] = m;
  if (k.toLowerCase() === 'user-agent') { if (!group || group.rules.length) robotsGroups.push(group = { agents: [], rules: [] }); group.agents.push(v); }
  else if (group && /^(allow|disallow)$/i.test(k)) group.rules.push(`${k.toLowerCase()}: ${v}`);
}
const AI_AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot'];
const policyFor = agent => {
  const g = robotsGroups.find(g => g.agents.some(a => a.toLowerCase() === agent.toLowerCase())) || robotsGroups.find(g => g.agents.includes('*'));
  if (!g) return 'no rules (allowed)';
  const blocksAll = g.rules.includes('disallow: /');
  return `${g.agents.includes('*') && !g.agents.some(a => a.toLowerCase() === agent.toLowerCase()) ? '(via *) ' : ''}${blocksAll ? 'BLOCKED' : 'allowed'}`;
};
const llms = await get(origin + '/llms.txt').catch(() => ({ status: 'error', body: '' }));
const notFound = await get(origin + '/qa-should-404-' + Date.now()).catch(e => ({ status: e.message, body: '' }));
const home = await get(origin + '/').catch(() => ({ body: '' }));
const aiAccess = {};
for (const [name, ua] of Object.entries(UA)) {
  if (name === 'chrome') continue;
  const r = await get(origin + '/', { ua }).catch(e => ({ status: e.message, body: '' }));
  aiAccess[name] = { status: r.status, bytes: r.body.length, sameAsBrowser: Math.abs(r.body.length - home.body.length) < home.body.length * 0.1 };
}

const site = {
  origin, prod, isPreview, testedAt: new Date().toISOString(),
  sitemap: { found: sm.sitemapFound, files: sm.sitemaps, count: sm.urls.length, hostsListed: [...new Set(sm.urls.map(u => new URL(u).origin))] },
  sitemapProblems: pages.filter(p => p.inSitemap && (p.status !== 200 || p.hops > 0 || p.noindex)).map(p => ({ path: p.path, status: p.status, hops: p.hops, noindex: p.noindex })),
  indexableNotInSitemap: indexable.filter(p => !p.inSitemap).map(p => p.path),
  orphans: indexable.filter(p => p.path !== '/' && !(inbound[p.path.replace(/\/+$/, '')]?.size)).map(p => p.path),
  duplicateTitles: dupes('title'),
  duplicateDescriptions: dupes('description'),
  slashStyle, offStyleLinks: offStyleLinks.slice(0, 40), slashVariant,
  brokenInternal, redirectedInternal: redirectedInternal.slice(0, 60), brokenExternal, unverifiedExternal,
  ogSizes,
  robots: { status: robots.status, body: robots.body, groups: robotsGroups, sitemapLine: /^sitemap:/im.test(robots.body || ''), aiPolicy: Object.fromEntries(AI_AGENTS.map(a => [a, policyFor(a)])) },
  llmsTxt: { status: llms.status, bytes: llms.body?.length || 0 },
  notFound: { status: notFound.status, linksHome: /href=["'](\/|https?:\/\/[^"']+\/)["']/.test(notFound.body || ''), title: stripTags((notFound.body?.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]) },
  crawlerAccess: aiAccess,
  inputsUsed: !!Object.keys(inputs).length,
};
writeJson('qa/seo.json', { site, pages });
fs.writeFileSync('qa/urls.txt', ok.map(p => p.url).join('\n') + '\n');

// ---------- summary for the report (candidates, not verdicts: Claude reviews each)
const L = [];
const add = (id, sev, text) => L.push(`- **${id}** (${sev}) ${text}`);
for (const p of ok) {
  const where = `\`${p.path}\``;
  if (p.noindex && !isPreview) add('E15', 'Blocker', `${where} is noindex (${p.metaRobots || ''} ${p.xRobotsTag || ''}). Intended?`);
  if (p.noindex) continue;
  if (!p.title) add('E1', 'High', `${where} has no title`);
  else if (p.titleLength < 40 || p.titleLength > 65) add('E1', 'High', `${where} title is ${p.titleLength} characters: "${p.title}"`);
  if (!p.description) add('E2', 'High', `${where} has no meta description`);
  else if (p.descriptionLength < 120 || p.descriptionLength > 170) add('E2', 'High', `${where} description is ${p.descriptionLength} characters`);
  if (p.h1s.length !== 1) add('E3', 'High', `${where} has ${p.h1s.length} H1s${p.h1s.length ? ': ' + p.h1s.map(h => `"${h}"`).join(', ') : ''}`);
  for (const s of p.headingSkips) add('E3', 'High', `${where} skips a heading level: ${s}`);
  if (!p.canonical) add('E4', 'Blocker', `${where} has no canonical`);
  else if (new URL(p.canonical, origin).origin !== prod) add('E4', 'Blocker', `${where} canonical points at ${new URL(p.canonical, origin).origin}, not ${prod}`);
  const missingOg = ['og:title', 'og:description', 'og:image', 'og:url'].filter(k => !p.og[k]);
  if (missingOg.length) add('E11', 'High', `${where} is missing ${missingOg.join(', ')}`);
  if (!p.twitter['twitter:card']) add('E11', 'High', `${where} has no twitter:card`);
  if (!p.lang) add('J10', 'Polish', `${where} has no html lang`);
  for (const e of p.emDashes) add('C3', 'High', `${where} em dash: "${e}"`);
  for (const e of p.emDashesInMeta) add('C3', 'High', `${where} em dash in title or description: "${e}"`);
  for (const e of p.placeholders) add('C1', 'Blocker', `${where} possible placeholder: "${e}"`);
  for (const l of p.links.staging) add('C8', 'Blocker', `${where} links to a staging or editor URL: ${l}`);
  for (const l of p.links.empty) add('B16', 'High', `${where} link with no destination: "${l}"`);
  const noAlt = p.images.filter(i => !i.hasAlt);
  if (noAlt.length) add('J8', 'High', `${where} has ${noAlt.length} image(s) with no alt attribute: ${noAlt.slice(0, 3).map(i => i.src.split('?')[0].split('/').pop()).join(', ')}`);
  const noDims = p.images.filter(i => !i.width || !i.height);
  if (noDims.length) add('I7', 'High', `${where} has ${noDims.length} image(s) without width and height (layout shift risk)`);
  for (const v of p.videos) {
    const miss = [!v.muted && v.autoplay && 'muted', !v.playsinline && v.autoplay && 'playsinline', !v.poster && 'poster'].filter(Boolean);
    if (miss.length) add('I6', 'High', `${where} video ${v.src || ''} is missing ${miss.join(', ')}`);
  }
  for (const f of p.iframes) if (f.loading !== 'lazy') add('I8', 'Polish', `${where} iframe ${f.src} does not lazy load`);
  for (const j of p.jsonld) if (!j.ok) add('F1', 'Blocker', `${where} JSON-LD does not parse: ${j.error}`);
  if (!p.jsonld.length) add('F1', 'High', `${where} has no JSON-LD`);
  if (p.wordCount < 40) add('G1', 'High', `${where} has only ${p.wordCount} words in the raw HTML. Is content loaded by JavaScript? (scan.mjs compares raw and rendered text)`);
}
const page1 = ok[0];
if (page1) {
  if (page1.externalFontCss.length) add('I5', 'High', `Fonts load from a third party: ${page1.externalFontCss.join(', ')}`);
  const offHost = page1.fontFaces.filter(f => f.url && /^https?:/.test(f.url) && !sameSite(f.url));
  if (offHost.length) add('I5', 'High', `@font-face files on another host: ${offHost.map(f => f.url).slice(0, 3).join(', ')}`);
  if (page1.fontFaces.length && !page1.fontPreloads.length) add('I5', 'High', 'No font is preloaded');
  // Fallback faces (src: local(...), size-adjust) load nothing, so they need no font-display
  const noSwap = page1.fontFaces.filter(f => f.url && !f.display);
  if (noSwap.length) add('I5', 'Polish', `${noSwap.length} @font-face rule(s) have no font-display`);
}
for (const d of site.duplicateTitles) add('E1', 'High', `Same title on ${d.paths.join(', ')}: "${d.value}"`);
for (const d of site.duplicateDescriptions) add('E2', 'High', `Same description on ${d.paths.join(', ')}`);
if (!site.sitemap.found) add('E5', 'High', 'No sitemap found at /sitemap-index.xml or /sitemap.xml');
if (site.sitemap.hostsListed.some(h => h !== prod)) add('E5', 'High', `Sitemap lists ${site.sitemap.hostsListed.join(', ')} (should be only ${prod})`);
for (const s of site.sitemapProblems) add('E5', 'High', `Sitemap lists \`${s.path}\` but it returns ${s.status}${s.hops ? ` after ${s.hops} redirect(s)` : ''}${s.noindex ? ', noindex' : ''}`);
for (const p of site.indexableNotInSitemap) add('E5', 'High', `\`${p}\` is indexable but not in the sitemap`);
for (const p of site.orphans) add('E12', 'High', `\`${p}\` has no internal links pointing to it`);
if (site.slashStyle === 'mixed') add('A11', 'High', 'Canonicals mix trailing slash and no trailing slash');
if (site.offStyleLinks.length) add('A11', 'High', `${site.offStyleLinks.length} internal link(s) do not match the ${site.slashStyle} trailing slash style, e.g. ${site.offStyleLinks[0].page} -> ${site.offStyleLinks[0].href}`);
if (site.slashVariant && site.slashVariant.hops.length > 2) add('E9', 'High', `Trailing slash variant ${site.slashVariant.tested} takes ${site.slashVariant.hops.length - 1} hops`);
const grouped = (list, key) => {
  const m = new Map();
  for (const b of list) { const k = key(b); if (!m.has(k)) m.set(k, { ...b, pages: [] }); m.get(k).pages.push(b.page); }
  return [...m.values()];
};
const onPages = g => g.pages.length > 3 ? `${g.pages.length} pages (${g.pages.slice(0, 2).join(', ')} and more)` : g.pages.map(p => `\`${p}\``).join(', ');
for (const g of grouped(site.brokenInternal, b => b.href + b.status)) add('E17', 'Blocker', `${g.href} ("${g.text}") returns ${g.status}, linked from ${onPages(g)}`);
for (const g of grouped(site.redirectedInternal, b => b.href).slice(0, 15)) add('E17', 'Polish', `${g.href} redirects to ${g.to}, linked from ${onPages(g)}`);
for (const g of grouped(site.brokenExternal, b => b.href)) add('E17', 'Blocker', `${g.href} returns ${g.status}, linked from ${onPages(g)}`);
for (const g of grouped(site.unverifiedExternal, b => b.href)) add('E17', 'Check', `${g.href} answered ${g.status} to a script (bot protection is common). Open it by hand. Linked from ${onPages(g)}`);
for (const [u, s] of Object.entries(ogSizes)) {
  if (s.error || s.status !== 200) add('E11', 'High', `Share image ${u} does not load (${s.error || s.status})`);
  else if (s.width !== 1200 || s.height !== 630) add('E11', 'High', `Share image is ${s.width}x${s.height}, not 1200x630: ${u}`);
  else if (s.bytes > 1_000_000) add('E11', 'Polish', `Share image is ${(s.bytes / 1e6).toFixed(1)} MB: ${u}`);
}
if (isPreview) {
  // Previews should block everything; the production robots.txt is checked from the source
  const blocksAll = /^\s*disallow:\s*\/\s*$/im.test(site.robots.body || '');
  const missing = ok.filter(p => !p.previewNoindexHeader && !p.noindex);
  if (missing.length === ok.length && !blocksAll) add('E7', 'Blocker', 'Preview robots.txt allows crawling and no page carries X-Robots-Tag or meta noindex: the preview can be indexed');
  else if (missing.length) add('E7', blocksAll ? 'High' : 'Blocker', `${missing.length} preview page(s) send no noindex (header or meta), e.g. ${missing.slice(0, 3).map(p => p.path).join(', ')}`);
  else if (!blocksAll) add('E7', 'Polish', 'Preview pages are noindex by header, but the preview robots.txt allows crawling; fine while Vercel adds the header, and better if the robots route blocks previews too');
  L.push('- **E6** (Check) robots.txt on a preview is not the production file. Read the production version in the source (`src/pages/robots.txt.ts` or `public/robots.txt`) for the Sitemap line and the AI crawler policy (G6)');
} else if (site.robots.status !== 200) add('E6', 'Blocker', `robots.txt returns ${site.robots.status}`);
else {
  if (!site.robots.sitemapLine) add('E6', 'High', 'robots.txt has no Sitemap line');
  const blocked = Object.entries(site.robots.aiPolicy).filter(([, v]) => v.includes('BLOCKED'));
  if (blocked.length && !isPreview) add('G6', 'High', `robots.txt blocks: ${blocked.map(([k]) => k).join(', ')}`);
  const named = AI_AGENTS.filter(a => robotsGroups.some(g => g.agents.some(x => x.toLowerCase() === a.toLowerCase())));
  if (!isPreview && named.length < 6) add('G6', 'High', `robots.txt names only ${named.length} AI crawlers explicitly (${named.join(', ') || 'none'})`);
}
if (site.notFound.status !== 404) add('E8', 'High', `A missing page returns ${site.notFound.status}, not 404`);
else if (!site.notFound.linksHome) add('E8', 'High', 'The 404 page has no link home');
for (const [bot, a] of Object.entries(aiAccess)) {
  if (a.status !== 200) add('G9', 'Blocker', `${bot} gets ${a.status} on the home page`);
  else if (!a.sameAsBrowser) add('G9', 'High', `${bot} gets a different page than a browser (${a.bytes} vs ${home.body.length} bytes). Challenge page?`);
}
if (site.llmsTxt.status !== 200) add('G7', 'Polish', 'No /llms.txt (optional, never gates launch)');

fs.writeFileSync('qa/seo-summary.md', `# SEO crawl: ${origin}\n\n${ok.length} pages crawled (${indexable.length} indexable), sitemap lists ${sm.urls.length}. ${new Date().toISOString().slice(0, 16)}\n\nThese are candidates. Check each before it goes in the report.\n\n${L.join('\n') || '- Nothing flagged'}\n`);
console.log(`Pages: ${ok.length} ok, ${indexable.length} indexable, ${pages.length - ok.length} not 200. Flags: ${L.length}. See qa/seo-summary.md and qa/seo.json`);
