// Stands in for the Vercel preview of this site: serves dist/ the way Vercel would
// (vercel.json redirects, trailing slashes, 404 page, and X-Robots-Tag: noindex on previews).
// Usage: node serve.mjs   (port 4600, or PORT=...)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const vercel = JSON.parse(fs.readFileSync(new URL('./vercel.json', import.meta.url)));
const preview = JSON.parse(fs.readFileSync(new URL('./preview.json', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.css': 'text/css', '.js': 'text/javascript' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const headers = preview.noindexHeader ? { 'x-robots-tag': 'noindex' } : {};
  const r = (vercel.redirects || []).find(r => r.source.replace(/\/$/, '') === url.pathname.replace(/\/$/, ''));
  if (r) { res.writeHead(r.permanent ? 308 : 307, { ...headers, location: r.destination }); return res.end(); }
  let p = path.join(root, decodeURIComponent(url.pathname));
  if (!path.extname(p) && !url.pathname.endsWith('/') && fs.existsSync(path.join(p, 'index.html'))) { res.writeHead(308, { ...headers, location: url.pathname + '/' }); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404, { ...headers, 'content-type': types['.html'] }); return res.end(fs.readFileSync(path.join(root, '404.html'))); }
  res.writeHead(200, { ...headers, 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
}).listen(process.env.PORT || 4600, () => console.log(`Preview at http://localhost:${process.env.PORT || 4600}`));
