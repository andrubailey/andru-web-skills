// Check every page's JSON-LD: does it parse, does the Schema.org validator accept it, does it
// have what Google and AI engines need, and does it match the page and the launch inputs.
// Usage: node qa/tools/schema-check.mjs [--seo qa/seo.json] [--inputs qa/launch-inputs.json] [--no-validator]
// Run seo-audit.mjs first. Writes qa/schema.json and qa/schema-summary.md.
import fs from 'node:fs';
import { parseArgs, readJson, writeJson, pool } from './lib.mjs';

const args = parseArgs();
const seo = readJson(args.seo || 'qa/seo.json');
if (!seo) { console.error('Run seo-audit.mjs first (qa/seo.json missing)'); process.exit(1); }
const inputs = readJson(args.inputs || 'qa/launch-inputs.json', {});
const biz = inputs.business || {};
const prod = seo.site.prod;

const BUSINESS = /^(GeneralContractor|HomeAndConstructionBusiness|LocalBusiness|ProfessionalService|Organization|Corporation|RoofingContractor|Electrician|Plumber|HousePainter|HVACBusiness)$/;
const LOCAL = /^(GeneralContractor|HomeAndConstructionBusiness|LocalBusiness|ProfessionalService|RoofingContractor)$/;
const DEPRECATED = ['HowTo', 'SpecialAnnouncement', 'ClaimReview', 'Dataset' /* not deprecated, but never right on a builder site */];
const digits = s => String(s || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const types = n => [].concat(n['@type'] || []);

// Flatten @graph and nested objects into a list of typed nodes
function nodes(data) {
  const out = [];
  const walk = (v, depth) => {
    if (Array.isArray(v)) return v.forEach(x => walk(x, depth));
    if (!v || typeof v !== 'object') return;
    if (v['@type']) out.push({ node: v, depth });
    for (const [k, x] of Object.entries(v)) if (k !== '@context') walk(x, depth + (v['@type'] ? 1 : 0));
  };
  walk(data, 0);
  return out;
}

const flags = [];
const add = (id, sev, page, text) => flags.push({ id, sev, page, text });
const perPage = [];
const idNames = {};

for (const p of seo.pages.filter(p => p.status === 200 && p.jsonld)) {
  const all = p.jsonld.filter(j => j.ok).flatMap(j => nodes(j.data));
  const top = all.filter(n => n.depth === 0).map(n => n.node);
  const typeList = all.map(n => types(n.node).join('/'));
  perPage.push({ path: p.path, types: typeList, blocks: p.jsonld.length, parseErrors: p.jsonld.filter(j => !j.ok).length });
  if (p.noindex) continue;
  const text = norm(p.text);

  // URLs inside schema must be production URLs
  const json = JSON.stringify(p.jsonld.map(j => j.data));
  const offHost = [...new Set([...json.matchAll(/https?:\/\/[^"\s]+/g)].map(m => m[0]).filter(u => /\.vercel\.app|localhost|-editor\./.test(u)))];
  if (offHost.length) add('F10', 'Blocker', p.path, `JSON-LD contains non-production URLs: ${offHost.slice(0, 3).join(', ')}`);

  for (const { node: n } of all) {
    const t = types(n);
    if (n['@id'] && n.name) (idNames[n['@id']] ||= new Set()).add(String(n.name));
    for (const d of DEPRECATED) if (t.includes(d)) add('F10', 'High', p.path, `Uses ${d} markup, which Google no longer shows or never fits this site`);
    if (n.potentialAction && JSON.stringify(n.potentialAction).includes('SearchAction')) add('F10', 'Polish', p.path, 'WebSite SearchAction (sitelinks search box) is retired by Google; remove unless the site has search');

    // Self-serving reviews: ratings of the business on its own site are not eligible and break the policy
    if (t.some(x => BUSINESS.test(x)) && (n.aggregateRating || n.review)) {
      add('F7', 'Blocker', p.path, `${t.join('/')} "${n.name}" carries ${n.aggregateRating ? 'aggregateRating' : 'review'} markup. Google treats reviews of a business on its own site as self-serving; remove it (keep the visible testimonials)`);
    }
    // Only this site's own business; a case study can describe the client's company
    if (t.some(x => BUSINESS.test(x)) && n.name && String(n.url || n['@id'] || '').startsWith(prod)) {
      if (biz.name && norm(n.name) !== norm(biz.name) && norm(n.alternateName) !== norm(biz.name)) add('F8', 'High', p.path, `Business name in schema "${n.name}" differs from the launch inputs "${biz.name}"`);
      if (n.telephone && biz.phone && digits(n.telephone) !== digits(biz.phone)) add('F8', 'Blocker', p.path, `Schema phone ${n.telephone} differs from ${biz.phone}`);
      if (n.telephone && !digits(p.text).includes(digits(n.telephone)) && p.path === '/') add('F8', 'High', p.path, `Schema phone ${n.telephone} is not visible on the page`);
    }
    // Other pages embed a short business node on purpose (Google does not follow @id across
    // pages), so the full property check runs on the home page's fullest node only
    if (t.some(x => LOCAL.test(x)) && n.name) {
      const miss = ['name', 'url', 'telephone', 'image', 'logo', 'areaServed', 'sameAs'].filter(k => !n[k]);
      if (!n.address && !n.areaServed) miss.push('address or areaServed');
      if (n.address && !n.geo && biz.serviceAreaBusiness !== true) miss.push('geo');
      if (miss.length && p.path === '/' && Object.keys(n).length > 6) add('F2', 'High', p.path, `${t.join('/')} is missing ${miss.join(', ')}`);
      if (inputs.schemaType && !t.includes(inputs.schemaType) && p.path === '/') add('F2', 'High', p.path, `Business type is ${t.join('/')}, expected ${inputs.schemaType}`);
      if (n.address && biz.address) {
        const a = n.address;
        const pairs = [['streetAddress', biz.address.street], ['addressLocality', biz.address.city], ['addressRegion', biz.address.region], ['postalCode', biz.address.postal]];
        for (const [k, v] of pairs) if (v && a[k] && norm(a[k]) !== norm(v)) add('F8', 'Blocker', p.path, `address.${k} "${a[k]}" differs from "${v}"`);
      }
      if (n.areaServed && inputs.serviceAreas?.length) {
        const served = [].concat(n.areaServed).map(a => norm(typeof a === 'string' ? a : a.name));
        const missing = inputs.serviceAreas.map(s => s.name).filter(s => !served.some(x => x.includes(norm(s))));
        if (missing.length) add('F2', 'High', p.path, `areaServed is missing ${missing.join(', ')}`);
      }
      if (n.priceRange) add('F2', 'Check', p.path, `priceRange is "${n.priceRange}". Confirm the client wants a price signal public`);
    }
    if (t.includes('FAQPage')) {
      const qs = [].concat(n.mainEntity || []);
      if (!qs.length) add('F5', 'High', p.path, 'FAQPage has no questions');
      for (const q of qs) {
        const qn = norm(q.name);
        const an = norm(q.acceptedAnswer?.text).slice(0, 80);
        if (!text.includes(qn)) add('F5', 'High', p.path, `FAQ question in schema is not on the page: "${q.name}"`);
        else if (an && !text.includes(an.slice(0, 50))) add('F5', 'High', p.path, `FAQ answer in schema does not match the page for "${q.name}"`);
      }
    }
    if (t.includes('BreadcrumbList')) {
      const items = [].concat(n.itemListElement || []);
      items.forEach((it, i) => { if (it.position !== i + 1) add('F4', 'High', p.path, `BreadcrumbList position ${it.position} at index ${i}`); });
      const urls = items.map(it => (typeof it.item === 'string' ? it.item : it.item?.['@id'] || it.item?.url)).filter(Boolean);
      if (urls.some(u => !u.startsWith(prod))) add('F4', 'High', p.path, 'BreadcrumbList item URLs are not on the production domain');
    }
    if (t.some(x => /^(Article|BlogPosting|NewsArticle)$/.test(x))) {
      const miss = ['headline', 'datePublished', 'author', 'image'].filter(k => !n[k]);
      if (miss.length) add('F1', 'High', p.path, `${t[0]} is missing ${miss.join(', ')}`);
    }
    if (t.includes('Person') && n.name && !n.sameAs && !n.url) add('G5', 'Polish', p.path, `Person "${n.name}" has no url or sameAs (LinkedIn, a profile page)`);
  }

  // Page-level expectations
  const has = re => typeList.some(t => re.test(t));
  if (p.path === '/') {
    if (!has(/WebSite/)) add('F3', 'High', p.path, 'No WebSite node on the home page');
    if (!has(BUSINESS)) add('F2', 'Blocker', p.path, 'No business node (GeneralContractor or similar) on the home page');
  } else if (!has(/BreadcrumbList/)) add('F4', 'High', p.path, 'No BreadcrumbList');
  if (p.faqQuestions?.length >= 3 && !has(/FAQPage/)) add('F5', 'High', p.path, `Page shows ${p.faqQuestions.length} questions but has no FAQPage markup`);
  // A case study can describe the client's company; only this site's own business nodes count
  const bizNodes = all.filter(n => types(n.node).some(x => BUSINESS.test(x)) && n.node.name && String(n.node.url || n.node['@id'] || '').startsWith(prod));
  const bizNames = new Set(bizNodes.map(n => norm(n.node.name)));
  if (bizNames.size > 1 && !bizNodes.every(n => n.node['@id'])) add('F10', 'High', p.path, `More than one business node with different names: ${[...bizNames].join(', ')}`);
}
for (const [id, names] of Object.entries(idNames)) if (names.size > 1) add('F10', 'High', '(site)', `@id ${id} has different names on different pages: ${[...names].join(' / ')}`);

// Schema.org validator (validator.schema.org). Sends only the JSON-LD blocks, not the page.
const validator = {};
if (!args['no-validator']) {
  const pages = seo.pages.filter(p => p.status === 200 && p.jsonld?.length && !p.noindex);
  // One at a time with backoff: the validator rate-limits (429) quickly
  let limited = 0;
  await pool(pages, 1, async p => {
    // After two pages that stayed rate-limited, stop asking; the rest are marked not checked
    if (limited >= 2) { validator[p.path] = { error: 'skipped after repeated 429s' }; add('F1', 'Check', p.path, 'Schema.org validator not checked (rate-limited); paste the JSON-LD at validator.schema.org by hand'); return; }
    const html = p.jsonld.filter(j => j.ok).map(j => `<script type="application/ld+json">${JSON.stringify(j.data)}</script>`).join('\n');
    try {
      let res;
      for (let attempt = 0; attempt < 4; attempt++) {
        res = await fetch('https://validator.schema.org/validate', { method: 'POST', body: new URLSearchParams({ html }), signal: AbortSignal.timeout(30000) });
        if (res.status !== 429) break;
        await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
      }
      if (res.status === 429) limited++;
      if (!res.ok) throw new Error(`validator answered ${res.status}`);
      const j = JSON.parse((await res.text()).replace(/^\)\]\}'\s*/, ''));
      validator[p.path] = { errors: j.totalNumErrors, warnings: j.totalNumWarnings, details: (j.errors || []).map(e => `${e.errorType} ${e.args?.join(' ')}`) };
      // per-node errors live inside tripleGroups
      const deep = JSON.stringify(j.tripleGroups || []).match(/"errorType":"[A-Z_]+","args":\[[^\]]*\]/g) || [];
      validator[p.path].details = [...new Set([...validator[p.path].details, ...deep.map(s => s.replace(/"errorType":"|","args":\[|\]|"/g, ' ').trim())])];
      if (j.totalNumErrors) add('F1', 'Blocker', p.path, `Schema.org validator: ${j.totalNumErrors} error(s): ${validator[p.path].details.slice(0, 3).join('; ')}`);
      if (j.totalNumWarnings) add('F1', 'Polish', p.path, `Schema.org validator: ${j.totalNumWarnings} warning(s)`);
    } catch (e) { validator[p.path] = { error: e.message }; add('F1', 'Check', p.path, `Schema.org validator not checked (${e.message.slice(0, 60)}); paste the JSON-LD at validator.schema.org by hand`); }
  });
}

writeJson('qa/schema.json', { perPage, validator, flags });
const lines = flags.map(f => `- **${f.id}** (${f.sev}) \`${f.page}\` ${f.text}`);
const table = perPage.map(p => `| \`${p.path}\` | ${[...new Set(p.types)].join(', ') || 'none'} | ${validator[p.path]?.errors ?? '-'} | ${validator[p.path]?.warnings ?? '-'} |`);
fs.writeFileSync('qa/schema-summary.md', `# Structured data\n\n| Page | Types | Validator errors | Warnings |\n|---|---|---|---|\n${table.join('\n')}\n\n## Flags (candidates; check each)\n\n${lines.join('\n') || '- Nothing flagged'}\n\nStill to do by hand: Google Rich Results Test on the home page, one home or project page, and any FAQ page (https://search.google.com/test/rich-results).\n`);
console.log(`Schema: ${perPage.length} pages, ${flags.length} flags. See qa/schema-summary.md`);
