// Builds the static images the pages link to (run by hand after changing the logo or scripts/og-image.html):
//   assets/og-image.png        1200×630 social preview — screenshot of scripts/og-image.html in headless Chrome/Edge
//   assets/icons/icon-*.png    favicons / PWA icons from icon.svg (48, 192, 512) and apple-touch-icon (180)
// Usage: node scripts/make-images.js   (CHROME=path overrides the browser lookup)
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { ROOT } from './lib/puzzles.js';

const BROWSERS = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].filter(Boolean);

const icons = path.join(ROOT, 'assets', 'icons');
await mkdir(icons, { recursive: true });
const svg = path.join(ROOT, 'icon.svg');
for (const size of [48, 192, 512]) {
  await sharp(svg, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(icons, `icon-${size}.png`));
}
// Apple draws its own rounded corners and shows transparency as black, so the touch icon gets the site background.
await sharp(svg, { density: 300 }).resize(150, 150).extend({ top: 15, bottom: 15, left: 15, right: 15, background: '#050811' })
  .flatten({ background: '#050811' }).png({ compressionLevel: 9 }).toFile(path.join(icons, 'apple-touch-icon.png'));
console.log('✓ assets/icons/');

const browser = BROWSERS.find(b => existsSync(b));
if (!browser) throw new Error('Nie znaleziono Chrome/Edge — ustaw CHROME=ścieżka');
const shot = path.join(tmpdir(), `og-${process.pid}.png`);
await promisify(execFile)(browser, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630',
  '--allow-file-access-from-files', `--screenshot=${shot}`, pathToFileURL(path.join(ROOT, 'scripts', 'og-image.html')).href
]);
await sharp(shot).resize(1200, 630).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(ROOT, 'assets', 'og-image.png'));
await rm(shot, { force: true });
console.log('✓ assets/og-image.png');
