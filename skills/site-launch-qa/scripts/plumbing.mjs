// Domain, SSL, redirects, robots and indexing headers.
// Usage: node qa/tools/plumbing.mjs --domain example.com [--preview https://x.vercel.app] [--old-urls qa/old-urls.txt] [--map qa/redirect-map.json]
// --old-urls: one old path or URL per line. --map: {"/old": "/new"} to check each lands where it should.
// Writes qa/plumbing.json and qa/plumbing-summary.md.
import fs from 'node:fs';
import tls from 'node:tls';
import { loadEnv, parseArgs, trace, get, readLines, readJson, writeJson, pool, UA } from './lib.mjs';

loadEnv();
const args = parseArgs();
const flags = [];
const add = (id, sev, text) => flags.push(`- **${id}** (${sev}) ${text}`);
const out = {};

if (args.domain) {
  const apex = args.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const variants = [`http://${apex}/`, `http://www.${apex}/`, `https://${apex}/`, `https://www.${apex}/`];
  out.variants = {};
  for (const v of variants) {
    const t = await trace(v).catch(e => ({ hops: [], status: e.cause?.code || e.message }));
    out.variants[v] = { hops: t.hops.map(h => `${h.status} ${h.location || ''}`.trim()), final: t.final, status: t.status };
  }
  const finals = [...new Set(Object.values(out.variants).map(v => v.final).filter(Boolean))];
  out.primary = finals.length === 1 ? finals[0] : null;
  if (finals.length !== 1) add('E9', 'Blocker', `Domain variants end on different URLs: ${finals.join(', ')}`);
  for (const [v, r] of Object.entries(out.variants)) {
    if (r.status !== 200) add('E9', 'Blocker', `${v} ends with ${r.status}`);
    // Vercel always upgrades http to https on the same host first, so http://www takes two
    // hops on any Vercel site. That one is expected; anything else with 2+ hops is not.
    else if (r.hops.length - 1 > 1) {
      const vercelHttpWww = v.startsWith('http://www.') && r.hops.length - 1 === 2 && r.hops[0].includes('https://www.');
      add('E9', vercelHttpWww ? 'Polish' : 'High', `${v} takes ${r.hops.length - 1} redirects: ${r.hops.join(' > ')}${vercelHttpWww ? ' (expected on Vercel: http to https on the same host comes first)' : ''}`);
    }
    else if (r.hops[0]?.startsWith('302') || r.hops[0]?.startsWith('307')) add('E9', 'High', `${v} uses a temporary redirect (${r.hops[0]})`);
  }
  // SSL certificate, apex and www (Vercel issues one per domain)
  const cert = host => new Promise(resolve => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 15000 }, () => {
      const c = s.getPeerCertificate();
      resolve({ valid: s.authorized, error: s.authorizationError || null, issuer: c.issuer?.O, expires: c.valid_to });
      s.end();
    });
    s.on('error', e => resolve({ valid: false, error: e.message }));
  });
  out.ssl = await cert(apex);
  out.sslWww = await cert(`www.${apex}`);
  for (const [host, c] of [[apex, out.ssl], [`www.${apex}`, out.sslWww]]) {
    if (!c.valid) add('E9', 'Blocker', `SSL certificate problem on ${host}: ${c.error}`);
    else if (new Date(c.expires) - Date.now() < 14 * 864e5) add('E9', 'High', `SSL certificate for ${host} expires ${c.expires}`);
  }

  const base = out.primary ? new URL(out.primary).origin : `https://${apex}`;
  const home = await get(base + '/');
  out.productionHeaders = { 'x-robots-tag': home.headers['x-robots-tag'] || null, 'strict-transport-security': home.headers['strict-transport-security'] || null, server: home.headers.server };
  if (/noindex/i.test(home.headers['x-robots-tag'] || '')) add('E7', 'Blocker', `Production sends X-Robots-Tag: ${home.headers['x-robots-tag']}`);
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(home.body)) add('E7', 'Blocker', 'Production home page has a noindex meta tag');
  if (!home.headers['strict-transport-security']) add('E9', 'Polish', 'No Strict-Transport-Security header');
  const robots = await get(base + '/robots.txt');
  out.robots = robots.body;
  if (robots.status !== 200) add('E6', 'Blocker', `robots.txt returns ${robots.status}`);
  else if (/^\s*disallow:\s*\/\s*$/im.test(robots.body.split(/user-agent:\s*\*/i)[1]?.split(/user-agent:/i)[0] || '')) add('E6', 'Blocker', 'robots.txt on production disallows everything for *');
  for (const [bot, ua] of Object.entries(UA)) {
    if (bot === 'chrome') continue;
    const r = await get(base + '/', { ua }).catch(e => ({ status: e.message }));
    if (r.status !== 200) add('G9', 'Blocker', `${bot} gets ${r.status} on production`);
  }
}

if (args.preview) {
  const p = await get(args.preview.replace(/\/$/, '') + '/');
  out.previewHeaders = { status: p.status, 'x-robots-tag': p.headers['x-robots-tag'] || null };
  const metaNoindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(p.body);
  if (!/noindex/i.test(p.headers['x-robots-tag'] || '') && !metaNoindex) add('E7', 'Blocker', `Preview ${args.preview} is indexable: no X-Robots-Tag noindex and no meta noindex`);
  else if (!/noindex/i.test(p.headers['x-robots-tag'] || '')) add('E7', 'Polish', 'Preview relies on the meta tag only; Vercel normally adds X-Robots-Tag: noindex itself');
}

// Old-site URLs
if (args['old-urls'] || args.map) {
  const map = readJson(args.map, null);
  const list = args['old-urls'] ? readLines(args['old-urls']) : Object.keys(map);
  const base = args.base || (out.primary ? new URL(out.primary).origin : `https://${(args.domain || '').replace(/^https?:\/\//, '')}`);
  out.oldUrls = await pool(list, 4, async raw => {
    const p = raw.startsWith('http') ? new URL(raw).pathname + new URL(raw).search : raw;
    const t = await trace(base + p).catch(e => ({ hops: [], status: e.message }));
    const final = t.final ? new URL(t.final).pathname : null;
    return { old: p, status: t.status, hops: t.hops.length - 1, first: t.hops[0]?.status, final, expected: map?.[p] || null };
  });
  for (const r of out.oldUrls) {
    if (r.status !== 200) add('E10', 'Blocker', `Old URL ${r.old} ends with ${r.status}`);
    else if (r.expected && r.final.replace(/\/$/, '') !== r.expected.replace(/\/$/, '')) add('E10', 'Blocker', `Old URL ${r.old} lands on ${r.final}, expected ${r.expected}`);
    else if (r.hops === 0 && r.old.replace(/\/$/, '') !== r.final.replace(/\/$/, '')) add('E10', 'High', `Old URL ${r.old} returns 200 without redirecting`);
    else if (r.hops > 1) add('E10', 'High', `Old URL ${r.old} takes ${r.hops} redirects to reach ${r.final}`);
    else if (r.hops === 1 && ![301, 308].includes(r.first)) add('E10', 'High', `Old URL ${r.old} uses a ${r.first} redirect, not permanent`);
  }
  const toHome = out.oldUrls.filter(r => r.final === '/' && r.old !== '/').length;
  if (toHome > 3) add('E10', 'High', `${toHome} old URLs redirect to the home page. Map each to its closest page instead`);
}

writeJson('qa/plumbing.json', out);
fs.writeFileSync('qa/plumbing-summary.md', `# Domain and redirects\n\n${new Date().toISOString().slice(0, 16)}\n\n${out.variants ? Object.entries(out.variants).map(([v, r]) => `- ${v}: ${r.hops.join(' > ')}`).join('\n') : ''}\n${out.ssl ? `\nSSL: ${out.ssl.valid ? 'valid' : 'INVALID'}, ${out.ssl.issuer || ''}, expires ${out.ssl.expires || '?'}\n` : ''}${out.oldUrls ? `\nOld URLs checked: ${out.oldUrls.length}, problems: ${flags.filter(f => f.includes('E10')).length}\n` : ''}\n## Flags\n\n${flags.join('\n') || '- Nothing flagged'}\n`);
console.log(`Plumbing: ${flags.length} flags. See qa/plumbing-summary.md`);
