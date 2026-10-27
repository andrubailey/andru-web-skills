// Lighthouse, mobile, median of several runs, on the key pages.
// Usage:
//   node qa/tools/lighthouse.mjs qa/key-pages.txt [--runs 3]          local Lighthouse 12.8.2 (works on protected previews)
//   node qa/tools/lighthouse.mjs qa/key-pages.txt --psi [--runs 3]    PageSpeed Insights API (public URLs only; Google's servers)
//   add --from-saved to rebuild the summary from the JSON files of an earlier run
// PSI works without a key at low volume; a free PSI_API_KEY in .env.local avoids rate limits.
// Writes qa/lighthouse/<slug>-<n>.json, qa/lighthouse.json and qa/lighthouse-summary.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadEnv, parseArgs, readLines, slugFor, writeJson, median, bypassHeadersFor } from './lib.mjs';

loadEnv();
const args = parseArgs();
const urls = readLines(args._[0] || 'qa/key-pages.txt');
const runs = +(args.runs || 3);
const psi = !!args.psi;
const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
fs.mkdirSync('qa/lighthouse', { recursive: true });

// A preview is noindex on purpose and its canonical points at production, so Lighthouse SEO
// fails "is-crawlable" (and sometimes "canonical") there. On a protected preview Lighthouse also
// fetches robots.txt without the bypass header and gets Vercel's login page ("robots-txt").
// For previews the gate uses the SEO score recomputed without those audits; the raw score is
// kept alongside, and production must pass them all.
const PREVIEW_ONLY = ['is-crawlable', 'canonical', 'robots-txt'];
const isPreviewUrl = u => { const h = new URL(u).host; return h.endsWith('.vercel.app') || /^(localhost|127\.0\.0\.1)(:|$)/.test(h) || (args.prod && new URL(args.prod).host !== h); };
function seoWithout(lhr, ids) {
  const refs = lhr.categories.seo.auditRefs.filter(r => r.weight > 0 && !ids.includes(r.id) && lhr.audits[r.id]?.score !== null);
  const w = refs.reduce((t, r) => t + r.weight, 0);
  return w ? Math.round(refs.reduce((t, r) => t + r.weight * lhr.audits[r.id].score, 0) / w * 100) : null;
}
function pick(lhr) {
  const a = lhr.audits;
  const preview = isPreviewUrl(lhr.finalDisplayedUrl || lhr.requestedUrl);
  return {
    seoRaw: Math.round(lhr.categories.seo.score * 100),
    preview,
    performance: Math.round(lhr.categories.performance.score * 100),
    accessibility: Math.round(lhr.categories.accessibility.score * 100),
    bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
    seo: preview ? seoWithout(lhr, PREVIEW_ONLY) : Math.round(lhr.categories.seo.score * 100),
    lcp: a['largest-contentful-paint']?.numericValue,
    cls: a['cumulative-layout-shift']?.numericValue,
    tbt: a['total-blocking-time']?.numericValue,
    fcp: a['first-contentful-paint']?.numericValue,
    si: a['speed-index']?.numericValue,
    lcpElement: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet?.slice(0, 160) || null,
    failing: Object.values(lhr.categories).flatMap(c => c.auditRefs.filter(r => r.weight > 0 && !(preview && PREVIEW_ONLY.includes(r.id))).map(r => a[r.id]).filter(x => x && x.score !== null && x.score < 0.9).map(x => `${c.id}: ${x.title}${x.displayValue ? ' (' + x.displayValue + ')' : ''}`)),
  };
}

async function runPsi(url) {
  const q = new URLSearchParams({ url, strategy: 'mobile' });
  CATS.forEach(c => q.append('category', c.toUpperCase().replace('-', '_')));
  if (process.env.PSI_API_KEY) q.set('key', process.env.PSI_API_KEY);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: AbortSignal.timeout(120000) });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return { lhr: j.lighthouseResult, field: j.loadingExperience?.metrics ? Object.fromEntries(Object.entries(j.loadingExperience.metrics).map(([k, v]) => [k, { p75: v.percentile, category: v.category }])) : null };
}

function runLocal(url, out) {
  const headers = bypassHeadersFor(url);
  const flags = ['-y', 'lighthouse@12.8.2', url, '--form-factor=mobile', '--screenEmulation.mobile', `--only-categories=${CATS.join(',')}`, '--output=json', `--output-path=${out}`, '--chrome-flags=--headless=new', '--quiet'];
  let tmp = null;
  if (Object.keys(headers).length) {
    // Lighthouse sends extra headers on every request, so the secret also reaches any
    // third-party host the page loads. Noted in the summary.
    tmp = path.join(os.tmpdir(), `lh-headers-${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify(headers), { mode: 0o600 });
    flags.push(`--extra-headers=${tmp}`);
  }
  try { execFileSync('npx', flags, { stdio: ['ignore', 'ignore', 'pipe'], timeout: 240000 }); }
  finally { if (tmp) fs.rmSync(tmp, { force: true }); }
  return { lhr: JSON.parse(fs.readFileSync(out, 'utf8')), field: null };
}

const results = [];
let usedBypass = false;
for (const url of urls) {
  const samples = [];
  let field = null;
  for (let n = 1; n <= runs; n++) {
    const out = `qa/lighthouse/${slugFor(url)}-${psi ? 'psi' : 'local'}-${n}.json`;
    try {
      // --from-saved: re-read earlier runs instead of running Lighthouse again
      const r = args['from-saved'] ? { lhr: JSON.parse(fs.readFileSync(out, 'utf8')), field: null } : psi ? await runPsi(url) : runLocal(url, out);
      if (psi && !args['from-saved']) fs.writeFileSync(out, JSON.stringify(r.lhr));
      if (!psi && Object.keys(bypassHeadersFor(url)).length) usedBypass = true;
      field = r.field || field;
      samples.push(pick(r.lhr));
      process.stdout.write(`\r${slugFor(url)} run ${n}/${runs}    `);
    } catch (e) { console.error(`\n${url} run ${n}: ${e.message.slice(0, 200)}`); }
  }
  if (!samples.length) { results.push({ url, error: 'no successful runs' }); continue; }
  // Median of each number; the failing audits come from the median-performance run
  const byPerf = [...samples].sort((a, b) => a.performance - b.performance);
  const mid = byPerf[Math.floor(byPerf.length / 2)];
  const m = k => median(samples.map(s => s[k]));
  results.push({ url, runs: samples.length, source: psi ? 'PageSpeed Insights' : 'Lighthouse 12.8.2 local', performance: m('performance'), accessibility: m('accessibility'), bestPractices: m('bestPractices'), seo: m('seo'), seoRaw: m('seoRaw'), preview: samples[0].preview, lcp: m('lcp'), cls: m('cls'), tbt: m('tbt'), fcp: m('fcp'), spread: `${byPerf[0].performance}-${byPerf.at(-1).performance}`, lcpElement: mid.lcpElement, failing: mid.failing, field });
}
console.log('');
writeJson('qa/lighthouse.json', results);

const gate = r => r.performance >= 95 && r.accessibility === 100 && r.bestPractices === 100 && r.seo === 100 && r.lcp < 2500 && r.cls < 0.1 && r.tbt < 200;
const s = v => (v == null ? '-' : v);
const rows = results.map(r => r.error ? `| ${new URL(r.url).pathname} | error | | | | | | | |` :
  `| ${new URL(r.url).pathname} | ${r.performance} (${r.spread}) | ${r.accessibility} | ${r.bestPractices} | ${r.seo}${r.preview && r.seoRaw !== r.seo ? ` (raw ${r.seoRaw})` : ''} | ${(r.lcp / 1000).toFixed(2)}s | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)}ms | ${gate(r) ? 'PASS' : 'FAIL'} |`);
const fails = results.filter(r => !r.error && !gate(r)).map(r => `### ${new URL(r.url).pathname}\nLCP element: \`${s(r.lcpElement)}\`\n${r.failing.map(f => `- ${f}`).join('\n')}`);
const fieldNote = results.some(r => r.field) ? `\n## Field data (real Chrome users, 28 days)\n\n${results.filter(r => r.field).map(r => `- ${new URL(r.url).pathname}: ${Object.entries(r.field).map(([k, v]) => `${k} p75 ${v.p75} (${v.category})`).join(', ')}`).join('\n')}\n` : '\nNo field data yet (normal for a new site; INP needs real visitors).\n';
fs.writeFileSync('qa/lighthouse-summary.md', `# Lighthouse, mobile (${psi ? 'PageSpeed Insights' : 'local Lighthouse 12.8.2'}, median of ${runs})\n\nGate: Performance 95+, Accessibility, Best Practices and SEO 100, LCP under 2.5s, CLS under 0.1, TBT under 200ms.\n${results.some(r => r.preview) ? '\nPreview URLs: SEO leaves out is-crawlable and canonical, which fail on purpose on a noindex preview (raw score in brackets). Production must score 100 with them.\n' : ''}${usedBypass ? '\nRan against a protected preview with the bypass header; Lighthouse also sent it to third-party hosts the page loads.\n' : ''}\n| Page | Perf (range) | A11y | Best Pr. | SEO | LCP | CLS | TBT | Gate |\n|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n${fieldNote}\n## What is holding back failing pages\n\n${fails.join('\n\n') || 'Nothing: every page passes.'}\n`);
console.log(`Lighthouse: ${results.filter(r => !r.error && gate(r)).length}/${results.length} pages pass the gate. See qa/lighthouse-summary.md`);
