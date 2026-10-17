// Copies only the public game files into dist/ for the static host (Cloudflare Pages; netlify.toml also works).
// Publishing the project root would also expose scripts/, node_modules/ (the host installs them there),
// the full player database and the admin panel, which only works with the local admin server.
import { cp, rm, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/puzzles.js';

const DIST = path.join(ROOT, 'dist');
const PUBLIC = [
  'index.html', 'connections.html', 'app.js', 'grid.js', 'footer.js', 'style.css', 'grid.css', 'icon.svg',
  'puzzles', 'grid', 'players', 'assets', 'data/players-index.json',
  '_headers' // Cloudflare Pages cache rules
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
console.log(`dist/: ${copied}/${PUBLIC.length} pozycji skopiowanych`);
