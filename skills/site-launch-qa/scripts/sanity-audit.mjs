// Sanity content audit. Read only: it never writes to the dataset.
// Run from the folder that has sanity.cli.ts (repo root, or studio/ in the site starter):
//   npx sanity exec <path-to>/qa/tools/sanity-audit.mjs --with-user-token
// --with-user-token uses Andru's own Sanity login, so drafts are visible and no token is stored.
// Writes sanity.json and sanity-summary.md into the nearest qa/ folder.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { getCliClient } = await import(require.resolve('sanity/cli'));
const client = getCliClient({ apiVersion: '2025-01-01' }).withConfig({ perspective: 'raw', useCdn: false });

let qaDir = process.env.QA_DIR;
for (let d = process.cwd(); !qaDir && d !== path.dirname(d); d = path.dirname(d)) if (fs.existsSync(path.join(d, 'qa'))) qaDir = path.join(d, 'qa');
qaDir ||= path.join(process.cwd(), 'qa');

const SYSTEM = /^(system\.|sanity\.|assist\.)/;
const docs = (await client.fetch('*[!(_type match "system.*") && !(_type match "sanity.*")]')).filter(d => !SYSTEM.test(d._type));
const published = docs.filter(d => !d._id.startsWith('drafts.') && !d._id.startsWith('versions.'));
const drafts = docs.filter(d => d._id.startsWith('drafts.'));
const pubIds = new Set(published.map(d => d._id));
const flags = [];
const add = (id, sev, text) => flags.push({ id, sev, text });
const name = d => `${d._type} "${d.title || d.name || d.heading || d.slug?.current || d._id}"`;

// Counts
const counts = {};
for (const d of docs) { const k = d._type; counts[k] ||= { published: 0, drafts: 0 }; counts[k][d._id.startsWith('drafts.') ? 'drafts' : 'published']++; }

// Drafts: never published, or published with unpublished changes
for (const d of drafts) {
  const pub = published.find(p => p._id === d._id.slice(7));
  if (!pub) add('D2', 'High', `Draft never published: ${name(d)} (${d._id})`);
  else if (new Date(d._updatedAt) > new Date(pub._updatedAt)) add('D2', 'High', `Unpublished changes on ${name(d)} since ${d._updatedAt.slice(0, 10)}`);
}

// Duplicate slugs within a type
const slugs = {};
for (const d of published) if (d.slug?.current) (slugs[`${d._type}:${d.slug.current}`] ||= []).push(d._id);
for (const [k, ids] of Object.entries(slugs)) if (ids.length > 1) add('D3', 'Blocker', `Duplicate slug ${k} on ${ids.join(', ')}`);
for (const d of published) if ('slug' in d && !d.slug?.current) add('D3', 'Blocker', `${name(d)} has an empty slug`);

// Walk every value: references, images, suspicious fields
const PRIVATE = /(^|_)(note|notes|internal|private|secret|cost|budget|fee|rate|margin|pricing|price)s?$/i;
const imageIssues = [];
const exposure = [];
const refs = [];
function walk(v, d, p) {
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, d, `${p}[${x?._key ? `_key=="${x._key}"` : i}]`));
  if (!v || typeof v !== 'object') return;
  if (v._ref && !v._weak && v._type !== 'sanity.imageAsset' && !v._ref.startsWith('image-') && !v._ref.startsWith('file-')) refs.push({ d, p, ref: v._ref });
  if (v.asset?._ref?.startsWith('image-')) {
    // Share images and video posters are never shown as <img>, so they need no alt text
    const notShown = /(og|share|social|poster|favicon|icon)[^.\[]*$/i.test(p.split('.').pop() || '');
    const decorative = v.decorative === true || v.isDecorative === true || notShown;
    if (!decorative && !(typeof v.alt === 'string' && v.alt.trim())) imageIssues.push({ id: 'D5', doc: d, path: p, issue: 'no alt text' });
    if (!v.hotspot) imageIssues.push({ id: 'D6', doc: d, path: p, issue: 'no hotspot' });
  }
  for (const [k, x] of Object.entries(v)) {
    if (k.startsWith('_')) continue;
    if (PRIVATE.test(k) && x !== null && x !== '' && !(Array.isArray(x) && !x.length)) exposure.push({ doc: d, path: `${p}.${k}`, sample: JSON.stringify(x).slice(0, 80) });
    walk(x, d, p ? `${p}.${k}` : k);
  }
}
for (const d of published) walk(d, d, '');
for (const r of refs) if (!pubIds.has(r.ref)) add('D4', 'Blocker', `${name(r.d)} references a missing or unpublished document ${r.ref} at ${r.p}`);
const altMissing = imageIssues.filter(i => i.id === 'D5');
const hotspotMissing = imageIssues.filter(i => i.id === 'D6');
const byDoc = list => { const m = {}; for (const i of list) (m[name(i.doc)] ||= []).push(i.path); return m; };
for (const [doc, paths] of Object.entries(byDoc(altMissing))) add('D5', 'High', `${doc}: ${paths.length} image(s) without alt text (${paths.slice(0, 3).join(', ')}${paths.length > 3 ? ', ...' : ''})`);
for (const [doc, paths] of Object.entries(byDoc(hotspotMissing))) add('D6', 'Polish', `${doc}: ${paths.length} image(s) without a hotspot`);

// SEO fields on routable documents
const seoTitle = d => d.seo?.title || d.seo?.metaTitle || d.seoTitle || d.metaTitle;
const seoDesc = d => d.seo?.description || d.seo?.metaDescription || d.seoDescription || d.metaDescription;
const routable = published.filter(d => d.slug?.current);
const noSeoTitle = routable.filter(d => !seoTitle(d));
const noSeoDesc = routable.filter(d => !seoDesc(d));
if (noSeoDesc.length) add('D1', 'High', `${noSeoDesc.length} routable document(s) have no SEO description field filled: ${noSeoDesc.slice(0, 6).map(name).join(', ')} (check the schema's field name; the page may fall back to an excerpt)`);
if (noSeoTitle.length) add('D1', 'Polish', `${noSeoTitle.length} routable document(s) have no SEO title override (fine if the page title is built from the document title)`);

// Test or leftover documents
for (const d of published) if (/\b(test|sample|copy of|untitled|lorem|delete me|placeholder)\b/i.test(`${d.title || ''} ${d.name || ''} ${d.slug?.current || ''}`)) add('D9', 'High', `Looks like a test or leftover document: ${name(d)}`);

// Public dataset: everything published is readable by anyone with the project ID
let aclMode = 'unknown';
try { aclMode = (await client.datasets.list()).find(x => x.name === client.config().dataset)?.aclMode || 'unknown'; } catch {}
if (aclMode === 'public' && exposure.length) add('D10', 'High', `Dataset is public and ${exposure.length} published field(s) look private: ${exposure.slice(0, 5).map(e => `${name(e.doc)} ${e.path}`).join('; ')}`);

const result = { project: client.config().projectId, dataset: client.config().dataset, aclMode, counts, flags, exposure, imageIssues: imageIssues.map(i => ({ ...i, doc: i.doc._id })) };
fs.mkdirSync(qaDir, { recursive: true });
fs.writeFileSync(path.join(qaDir, 'sanity.json'), JSON.stringify(result, null, 2));
const table = Object.entries(counts).sort().map(([t, c]) => `| ${t} | ${c.published} | ${c.drafts} |`).join('\n');
fs.writeFileSync(path.join(qaDir, 'sanity-summary.md'), `# Sanity: ${result.project}/${result.dataset} (${aclMode})\n\n| Type | Published | Drafts |\n|---|---|---|\n${table}\n\n## Flags (candidates; check each)\n\n${flags.map(f => `- **${f.id}** (${f.sev}) ${f.text}`).join('\n') || '- Nothing flagged'}\n\n${exposure.length ? `## Published fields that may be private (dataset is ${aclMode})\n\n${exposure.slice(0, 40).map(e => `- ${name(e.doc)} \`${e.path}\`: ${e.sample}`).join('\n')}\n` : ''}\nAlso run \`npx sanity documents validate -y\` for the schema's own required-field rules.\n`);
console.log(`Sanity: ${published.length} published, ${drafts.length} drafts, ${flags.length} flags. See ${path.join(qaDir, 'sanity-summary.md')}`);
