// Builds dist/ for the static host (Vercel; netlify.toml and _headers also work):
// - copies only the public files — publishing the project root would also expose scripts/, node_modules/
//   (the host installs them there), the full player database and the admin panel (local admin server only);
// - writes every page in every language from the English templates (scripts/lib/site-pages.js):
//   / and /connections, and the same under /pl, /es, /fr;
// - writes robots.txt and sitemap.xml (the pages only — never the board JSON files).
import { cp, rm, mkdir, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/puzzles.js';
import { SITE, buildPages, sitemap } from './lib/site-pages.js';

const DIST = path.join(ROOT, 'dist');
const PUBLIC = [
  '404.html', 'site.js', 'app.js', 'grid.js', 'footer.js', 'style.css', 'grid.css', 'icon.svg',
  'site.webmanifest', 'puzzles', 'grid', 'players', 'assets', 'data/players-index.json',
  '_headers' // Cloudflare Pages / Netlify response headers
];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
let copied = 0;
for (const entry of PUBLIC) {
  const src = path.join(ROOT, entry);
  try { await access(src); } catch { console.warn(`⚠ brak ${entry} — pomijam`); continue; }
  await cp(src, path.join(DIST, entry), { recursive: true });
  copied++;
}

const pages = await buildPages(ROOT);
for (const { file, html } of pages) {
  await mkdir(path.dirname(path.join(DIST, file)), { recursive: true });
  await writeFile(path.join(DIST, file), html);
}

const today = new Date().toISOString().slice(0, 10);
await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(path.join(DIST, 'sitemap.xml'), sitemap(pages, today));
console.log(`dist/: ${copied}/${PUBLIC.length} pozycji skopiowanych, ${pages.length} stron HTML, robots.txt, sitemap.xml`);
