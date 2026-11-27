// Link-preview images, one per game and language: assets/og/<mode>-<lang>.png (1200×630), screenshots of
// scripts/og-mode.html in headless Chrome/Edge (the same approach as make-images.js; no extra dependency).
// The pages link them in og:image / twitter:image (scripts/lib/site-pages.js). New file names on purpose:
// /assets is cached for 7 days, so a changed picture needs a new name (or a ?v= in site-pages.js).
// Usage: node scripts/make-og-images.js [mode…]   (CHROME=path overrides the browser lookup)
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { ROOT } from './lib/puzzles.js';

export const OG_MODES = ['guess', 'path', 'grid'];
export const OG_LANGS = ['en', 'pl', 'es', 'fr'];

const BROWSERS = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].filter(Boolean);

const browser = BROWSERS.find(b => existsSync(b));
if (!browser) throw new Error('Nie znaleziono Chrome/Edge — ustaw CHROME=ścieżka');
const outDir = path.join(ROOT, 'assets', 'og');
await mkdir(outDir, { recursive: true });
const modes = process.argv.slice(2).filter(m => OG_MODES.includes(m));
const template = pathToFileURL(path.join(ROOT, 'scripts', 'og-mode.html')).href;

for (const mode of modes.length ? modes : OG_MODES) {
  for (const lang of OG_LANGS) {
    const shot = path.join(tmpdir(), `og-${mode}-${lang}-${process.pid}.png`);
    await promisify(execFile)(browser, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630',
      '--allow-file-access-from-files', '--virtual-time-budget=3000', `--screenshot=${shot}`, `${template}?mode=${mode}&lang=${lang}`
    ]);
    const file = path.join(outDir, `${mode}-${lang}.png`);
    await sharp(shot).resize(1200, 630).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(file);
    await rm(shot, { force: true });
    console.log(`✓ assets/og/${mode}-${lang}.png`);
  }
}
