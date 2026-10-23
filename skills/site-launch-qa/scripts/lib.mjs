// Shared helpers for the site-launch-qa scripts. No dependencies beyond Node 20+.
import fs from 'node:fs';
import path from 'node:path';

// Load .env and .env.local from the repo root (the folder you run the scripts from).
// Values already in the environment win. Secrets are never printed.
export function loadEnv(dir = process.cwd()) {
  for (const name of ['.env', '.env.local']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

// --key value and --flag arguments, plus positional ones in args._
export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

// Vercel previews sit behind Vercel Authentication. The project's "Protection Bypass for
// Automation" secret goes in .env.local as VERCEL_AUTOMATION_BYPASS_SECRET. It is only ever
// sent to the preview's own host, never to third parties.
export function bypassHeadersFor(url) {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return {};
  const host = new URL(url).host;
  if (!host.endsWith('.vercel.app')) return {};
  // Also hide the Vercel Toolbar, which otherwise floats over previews in screenshots and audits
  return { 'x-vercel-protection-bypass': secret, 'x-vercel-skip-toolbar': '1' };
}

export const UA = {
  chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  googlebot: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/141.0.0.0 Safari/537.36',
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  ClaudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
};

// One request, no redirect following, so callers can count hops.
export async function get(url, { ua = UA.chrome, method = 'GET', headers = {} } = {}) {
  const res = await fetch(url, {
    method,
    redirect: 'manual',
    headers: { 'user-agent': ua, accept: 'text/html,application/xhtml+xml,*/*', ...bypassHeadersFor(url), ...headers },
    signal: AbortSignal.timeout(30000),
  });
  const body = method === 'HEAD' ? '' : await res.text();
  return { status: res.status, headers: Object.fromEntries(res.headers), location: res.headers.get('location'), body };
}

// Follow redirects by hand and return every hop.
export async function trace(url, opts = {}) {
  const hops = [];
  let current = url;
  for (let i = 0; i < 10; i++) {
    const r = await get(current, { ...opts, method: opts.method || 'GET' });
    hops.push({ url: current, status: r.status, location: r.location });
    if (r.status >= 300 && r.status < 400 && r.location) current = new URL(r.location, current).href;
    else return { hops, final: current, status: r.status, headers: r.headers, body: r.body };
  }
  return { hops, final: current, status: 'too many redirects' };
}

// Every <loc> in a sitemap, following sitemap indexes (Astro writes sitemap-index.xml).
export async function sitemapUrls(origin) {
  const seen = new Set();
  const urls = [];
  const start = [`${origin}/sitemap-index.xml`, `${origin}/sitemap.xml`];
  const queue = [];
  for (const s of start) {
    const r = await get(s).catch(() => null);
    if (r && r.status === 200 && r.body.includes('<loc>')) { queue.push({ url: s, body: r.body }); break; }
  }
  while (queue.length) {
    const { url, body } = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const locs = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
    if (/<sitemapindex/.test(body)) {
      for (const loc of locs) {
        const child = rebase(loc, origin);
        const r = await get(child).catch(() => null);
        if (r && r.status === 200) queue.push({ url: child, body: r.body });
      }
    } else urls.push(...locs);
  }
  return { sitemapFound: seen.size > 0, sitemaps: [...seen], urls };
}

// Sitemaps on a preview list production URLs (Astro uses `site`). Point them at the host
// actually being tested.
export function rebase(url, origin) {
  const u = new URL(url);
  const o = new URL(origin);
  u.protocol = o.protocol;
  u.host = o.host;
  return u.href;
}

export function slugFor(url) {
  const p = new URL(url).pathname.replace(/\/+$/, '');
  return p ? p.slice(1).replace(/\//g, '_') : 'home';
}

export function readLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

// Run async work over a list with a small concurrency limit.
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const n = i++; out[n] = await fn(items[n], n); }
  }));
  return out;
}

export const decode = s => (s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

// Width and height from the first bytes of a PNG, JPEG, GIF or WebP.
export function imageSize(buf) {
  const b = Buffer.from(buf);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { type: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') return { type: 'gif', width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { type: 'webp', width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { type: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') { const bits = b.readUInt32LE(21); return { type: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length - 9) {
      if (b[o] !== 0xff) { o++; continue; }
      const marker = b[o + 1];
      const len = b.readUInt16BE(o + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'jpeg', width: b.readUInt16BE(o + 7), height: b.readUInt16BE(o + 5) };
      }
      o += 2 + len;
    }
  }
  return null;
}

export const median = arr => {
  const s = arr.filter(n => typeof n === 'number').sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
