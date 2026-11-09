// Copies only the public game files into dist/ for the static host (Vercel; netlify.toml and _headers also work).
// Publishing the project root would also expose scripts/, node_modules/ (the host installs them there),
// the full player database and the admin panel, which only works with the local admin server.
// Also writes robots.txt and sitemap.xml (the indexable pages only — never the board JSON files).
import { cp, rm, mkdir, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/puzzles.js';

const SITE = 'https://connect4.lol';
const DIST = path.join(ROOT, 'dist');
const PUBLIC = [
  'index.html', 'connections.html', '404.html', 'app.js', 'grid.js', 'footer.js', 'style.css', 'grid.css', 'icon.svg',
  'site.webmanifest', 'puzzles', 'grid', 'players', 'assets', 'data/players-index.json',
  '_headers' // Cloudflare Pages / Netlify response headers
];
// Indexable pages (clean URLs: vercel.json cleanUrls serves connections.html at /connections).
const PAGES = ['/', '/connections'];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
let copied = 0;
for (const entry of PUBLIC) {
  const src = path.join(ROOT, entry);
  try { await access(src); } catch { console.warn(`⚠ brak ${entry} — pomijam`); continue; }
  await cp(src, path.join(DIST, entry), { recursive: true });
  copied++;
}

const today = new Date().toISOString().slice(0, 10);
await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`dist/: ${copied}/${PUBLIC.length} pozycji skopiowanych, robots.txt, sitemap.xml (${PAGES.length} stron)`);
