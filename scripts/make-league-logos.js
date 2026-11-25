// White league logos for dark tiles, traced on a transparent background:
//   assets/logos/leagues-white/{ID}.webp      the sign alone, without the league's name — the Grid's condition headers
//   assets/logos/leagues-captioned/{ID}.webp  the logo with the league's name under it — Guess the Pro's tiles:
//     LCS, LEC, LPL from the artwork in design/league-logos/ (not published), the rest from assets/logos/leagues
//     (their logos already carry the name).
// Every pixel becomes white; its opacity says how much it belongs to the logo: the original alpha, how light it is
// (a white logo on a dark picture; light parts of a two-tone logo, e.g. the old LCS shield's border and letters) or
// how dark it is (a dark logo on a light picture).
// Usage: node scripts/make-league-logos.js   (re-run after adding or replacing a league logo)
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/puzzles.js';

const LOGOS = path.join(ROOT, 'assets', 'logos');
const SRC = path.join(LOGOS, 'leagues');
const WHITE = path.join(LOGOS, 'leagues-white');
const CAPTIONED = path.join(LOGOS, 'leagues-captioned');
const ARTWORK = path.join(ROOT, 'design', 'league-logos');
await mkdir(WHITE, { recursive: true });
await mkdir(CAPTIONED, { recursive: true });

const smooth = (lo, hi, x) => Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
const lumOf = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

/** White trace of an image; `weight(lum, alpha)` is how much of each pixel (0…1) stays. Trimmed to the logo. */
async function trace(input, weight, { size } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = out[i + 1] = out[i + 2] = 255;
    out[i + 3] = Math.round(255 * weight(lumOf(data, i), data[i + 3] / 255));
  }
  let img = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
  if (size) {
    // Trim the transparent margin, then fit into size×size (transparent padding keeps the ratio).
    const trimmed = await img.png().toBuffer().then(b => sharp(b).trim({ threshold: 1 }).toBuffer());
    img = sharp(trimmed).resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } });
  }
  return img.webp({ quality: 95, alphaQuality: 100 });
}

/** A logo file traced whole, or only its light parts when it is two-tone (the old LCS shield). */
async function plainTrace(input, opts) {
  const { data } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lums = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) lums.push(lumOf(data, i));
  lums.sort((a, b) => a - b);
  const twoTone = lums[Math.floor(lums.length * 0.9)] - lums[Math.floor(lums.length * 0.1)] > 0.3;
  return trace(input, (lum, a) => a * (twoTone ? smooth(0.25, 0.45, lum) : 1), opts);
}

// 1. The Grid: the sign only, never the league's name in the picture (the name is the caption under it). LCK and
//    LTA are cut to their sign (the regions above / left of the lettering); LCS is the 2026 rhombus from the artwork.
const GRID_SIGN = {
  LCK: { crop: { left: 0, top: 0, width: 128, height: 81 } },
  LTA: { crop: { left: 0, top: 0, width: 77, height: 128 } },
  LCS: { file: 'lcs.jpg', crop: { left: 300, top: 100, width: 360, height: 505 }, weight: lum => smooth(0.55, 0.8, lum) }
};
for (const file of (await readdir(SRC)).filter(f => f.endsWith('.webp'))) {
  const sign = GRID_SIGN[path.basename(file, '.webp')];
  let img;
  if (!sign) img = await plainTrace(path.join(SRC, file));
  else if (sign.file) img = await trace(await sharp(path.join(ARTWORK, sign.file)).extract(sign.crop).png().toBuffer(), sign.weight, { size: 128 });
  else img = await plainTrace(await sharp(path.join(SRC, file)).extract(sign.crop).png().toBuffer(), { size: 128 });
  await img.toFile(path.join(WHITE, file));
  console.log(`leagues-white/${file}: ${sign ? 'sam znak' : 'całe logo'}`);
}

// 2. With the name, for Guess the Pro: the artwork where there is some, else the plain white logo.
const ARTWORK_LOGOS = {
  // A white logo on a black picture with dim lettering behind it; the LCS half of an LCS/CBLOL announcement.
  LCS: { file: 'lcs.jpg', crop: { left: 300, top: 100, width: 360, height: 750 }, weight: lum => smooth(0.55, 0.8, lum) },
  // A dark logo on a light teal gradient.
  LEC: { file: 'lec.jpg', weight: lum => 1 - smooth(0.12, 0.3, lum) },
  // A red logo with its own transparency.
  LPL: { file: 'lpl.webp', weight: (lum, a) => a }
};
for (const file of (await readdir(SRC)).filter(f => f.endsWith('.webp'))) {
  const id = path.basename(file, '.webp');
  const art = ARTWORK_LOGOS[id];
  if (!art) {
    await (await plainTrace(path.join(SRC, file))).toFile(path.join(CAPTIONED, file));
    console.log(`leagues-captioned/${file}: z assets/logos/leagues (nazwa już w logo)`);
    continue;
  }
  let input = path.join(ARTWORK, art.file);
  if (art.crop) input = await sharp(input).extract(art.crop).png().toBuffer();
  await (await trace(input, art.weight, { size: 256 })).toFile(path.join(CAPTIONED, file));
  console.log(`leagues-captioned/${file}: z ${art.file}`);
}
