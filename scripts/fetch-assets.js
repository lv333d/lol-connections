// Downloads missing player portraits (players/{id}.webp) and team logos (assets/logos/teams/{id}.webp)
// from Leaguepedia, converting them to compressed WebP with sharp, plus country flags (assets/flags/{code}.svg)
// for nationality conditions from the flag-icons package (MIT).
//
// Usage: npm run fetch-assets [-- --all] [-- --teams] [-- --limit=50]
//   default   players used in puzzles/*.json (type "player") and in grid/*.json (answers + teammate conditions),
//             plus logos of teams and flags of countries used by grid conditions
//   --all     every player in data/players.json (the search list shows a portrait for each)
//   --teams   logos of every team in data/teams.json
//   --limit   stop after N portraits (handy for a first test)
import { readFile, readdir, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, PUZZLES_DIR, slugify } from './lib/puzzles.js';
import { cargoQuery, cargoStr, imageUrls, fetchBinary } from './lib/leaguepedia.js';

const PLAYERS_DIR = path.join(ROOT, 'players');
const TEAM_LOGOS_DIR = path.join(ROOT, 'assets', 'logos', 'teams');
const GRID_DIR = path.join(ROOT, 'grid');
const LEAGUE_LOGOS_DIR = path.join(ROOT, 'assets', 'logos', 'leagues');
const FLAGS_DIR = path.join(ROOT, 'assets', 'flags');
const FLAG_URL = code => `https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3/${code}.svg`;
// Leaguepedia file names of the current league logos (the league pages have no page image).
const LEAGUE_LOGOS = {
  LCK: 'LCK 2021 logo.png',
  LPL: 'LoL Pro Leaguelogo std.png',
  LEC: 'LEC logo small.png',
  LCS: 'LCS 2020 Logo.png',
  LTA: 'LTA logo.png'
};
const PORTRAIT_SIZE = 256;
const LOGO_SIZE = 128;
const DOWNLOAD_CONCURRENCY = 4;

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const ALL_TEAMS = args.includes('--teams');
const LIMIT = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || Infinity;

const exists = f => access(f).then(() => true, () => false);
const readJson = async (f, fallback) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return fallback; } };
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function jsonFiles(dir) {
  try { return (await readdir(dir)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f => path.join(dir, f)); }
  catch { return []; }
}

/** Later photos score higher: year first, then a rough position of the split within the year. */
function photoScore(img) {
  const text = `${img.Tournament} ${img.FileName}`;
  const year = Math.max(0, ...[...text.matchAll(/\b(20\d\d)\b/g)].map(m => Number(m[1])));
  const phase = /World|\bWC\b/i.test(text) ? 5 : /Split 3|Summer|Rounds 3-5/i.test(text) ? 4
    : /Split 2|MSI|Rounds 1-2/i.test(text) ? 3 : /Spring|Split 1|Winter|Cup/i.test(text) ? 2 : 1;
  const allStar = /All-?Star|Allstars/i.test(text) ? -1 : 0;
  return year * 10 + phase + allStar;
}

async function runPool(items, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, async () => {
    while (i < items.length) await worker(items[i++]);
  }));
}

async function collectTargets(db) {
  /** @type {Map<string, string>} id → display name (used for redirect lookup) */
  const targets = new Map();
  for (const file of await jsonFiles(PUZZLES_DIR)) {
    const board = await readJson(file, null);
    board?.categories?.forEach(c => c.items.forEach(it => {
      if (it.type === 'player') targets.set(it.id, typeof it.name === 'string' ? it.name : it.name.pl || it.name.en);
    }));
  }
  const gridTeams = new Set();
  const gridFlags = new Set();
  for (const file of await jsonFiles(GRID_DIR)) {
    const board = await readJson(file, null);
    board?.answers?.flat(2).forEach(id => targets.set(id, db.byId.get(id)?.nick || id));
    [...(board?.rows || []), ...(board?.cols || [])].forEach(c => {
      if (c.kind === 'teammate') targets.set(c.playerId, db.byId.get(c.playerId)?.nick || c.playerId);
      if (c.kind === 'team') gridTeams.add(c.id);
      if (c.kind === 'nationality') gridFlags.add(c.id);
    });
  }
  if (ALL) db.players.forEach(p => targets.set(p.id, p.nick));
  return { targets, gridTeams, gridFlags };
}

/** Maps target ids to Leaguepedia pages: DB id → DB nick → PlayerRedirects (old/alternate nicknames). */
async function resolvePages(missing, db) {
  const pageOf = new Map();
  const unresolved = [];
  for (const [id, name] of missing) {
    const direct = db.byId.get(id);
    const byNick = (db.byNickSlug.get(id) || db.byNickSlug.get(slugify(name)) || [])
      .sort((a, b) => b.tournaments - a.tournaments)[0];
    const p = direct || byNick;
    if (p) pageOf.set(id, p.wikiPage);
    else unresolved.push([id, name]);
  }
  for (const batch of chunk(unresolved, 100)) {
    const rows = await cargoQuery({
      tables: 'PlayerRedirects', fields: 'AllName,OverviewPage',
      where: `AllName IN (${batch.map(([, n]) => cargoStr(n)).join(',')})`
    });
    const byName = new Map(rows.map(r => [r.AllName.toLowerCase(), r.OverviewPage]));
    batch.forEach(([id, name]) => { const page = byName.get(name.toLowerCase()); if (page) pageOf.set(id, page); });
  }
  return pageOf;
}

// Cargo matches case-insensitively and PlayerImages keeps the link as typed ("xPeke") while the canonical
// page is "XPeke", so results are keyed by the lower-cased page name.
async function pickPortraitFiles(pages) {
  const best = new Map(); // lower-cased page → { file, score }
  for (const batch of chunk([...new Set(pages)], 100)) {
    const rows = await cargoQuery({
      tables: 'PlayerImages', fields: 'FileName,Link,Tournament,ImageType',
      where: `Link IN (${batch.map(cargoStr).join(',')})`
    });
    for (const r of rows) {
      const key = r.Link.toLowerCase();
      const score = photoScore(r);
      if (!best.has(key) || score > best.get(key).score) best.set(key, { file: r.FileName, score });
    }
  }
  // Fallback: the profile image set on the player page itself.
  const without = [...new Set(pages)].filter(p => !best.has(p.toLowerCase()));
  for (const batch of chunk(without, 100)) {
    const rows = await cargoQuery({ tables: 'Players', fields: 'OverviewPage,Image', where: `OverviewPage IN (${batch.map(cargoStr).join(',')}) AND Image IS NOT NULL` });
    rows.forEach(r => { if (r.Image) best.set(r.OverviewPage.toLowerCase(), { file: r.Image, score: 0 }); });
  }
  return new Map(pages.map(p => [p, best.get(p.toLowerCase())?.file]).filter(([, f]) => f));
}

async function convert(url, outFile, kind) {
  const input = await fetchBinary(url);
  const img = sharp(input).rotate();
  const pipeline = kind === 'portrait'
    ? img.resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: 'cover', position: 'top' }).webp({ quality: 80, effort: 5 })
    : img.resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85, alphaQuality: 90, effort: 5 });
  await writeFile(outFile, await pipeline.toBuffer());
}

async function main() {
  const players = await readJson(path.join(ROOT, 'data', 'players.json'), []);
  const teams = await readJson(path.join(ROOT, 'data', 'teams.json'), []);
  if (!players.length) console.warn('⚠ Brak data/players.json — uruchom najpierw npm run build-players (nicki rozwiążę przez PlayerRedirects).');
  const db = { players, byId: new Map(players.map(p => [p.id, p])), byNickSlug: new Map() };
  players.forEach(p => {
    const k = slugify(p.nick);
    if (!db.byNickSlug.has(k)) db.byNickSlug.set(k, []);
    db.byNickSlug.get(k).push(p);
  });

  const { targets, gridTeams, gridFlags } = await collectTargets(db);
  await mkdir(PLAYERS_DIR, { recursive: true });
  const missing = [];
  for (const [id, name] of targets) if (!(await exists(path.join(PLAYERS_DIR, `${id}.webp`)))) missing.push([id, name]);
  const todo = missing.slice(0, LIMIT);
  console.log(`Portrety: ${targets.size} potrzebnych, ${missing.length} brakuje, pobieram ${todo.length}.`);

  const report = { ok: 0, noPage: [], noImage: [], failed: [] };
  if (todo.length) {
    const pageOf = await resolvePages(todo, db);
    const fileOf = await pickPortraitFiles([...pageOf.values()]);
    const urlOf = await imageUrls([...new Set(fileOf.values())]);
    await runPool(todo, async ([id, name]) => {
      const page = pageOf.get(id);
      if (!page) return report.noPage.push(name);
      const url = urlOf.get(fileOf.get(page));
      if (!url) return report.noImage.push(name);
      try {
        await convert(url, path.join(PLAYERS_DIR, `${id}.webp`), 'portrait');
        report.ok++;
        process.stdout.write(`  ✓ ${id}\n`);
      } catch (e) {
        report.failed.push(`${name}: ${e.message}`);
      }
    });
  }

  // Logos: the Teams table file, else Leaguepedia's naming convention "{Team page}logo square.png".
  const wantedTeams = teams.filter(t => ALL_TEAMS || gridTeams.has(t.id));
  const logoJobs = Object.entries(LEAGUE_LOGOS).map(([id, file]) => ({ label: `[liga] ${id}`, files: [file], out: path.join(LEAGUE_LOGOS_DIR, `${id}.webp`) }));
  for (const t of wantedTeams) {
    const files = [t.logo, `${t.page || t.name}logo square.png`].filter(Boolean);
    logoJobs.push({ label: `[drużyna] ${t.name}`, files, out: path.join(TEAM_LOGOS_DIR, `${t.id}.webp`) });
  }
  await mkdir(TEAM_LOGOS_DIR, { recursive: true });
  await mkdir(LEAGUE_LOGOS_DIR, { recursive: true });
  const logoTodo = [];
  for (const job of logoJobs) if (!(await exists(job.out))) logoTodo.push(job);
  console.log(`\nLoga lig i drużyn: ${logoJobs.length} potrzebnych, pobieram ${logoTodo.length}.`);
  if (logoTodo.length) {
    const logoUrls = await imageUrls([...new Set(logoTodo.flatMap(j => j.files))]);
    await runPool(logoTodo, async job => {
      const url = job.files.map(f => logoUrls.get(f)).find(Boolean);
      if (!url) return report.noImage.push(job.label);
      try { await convert(url, job.out, 'logo'); report.ok++; }
      catch (e) { report.failed.push(`${job.label}: ${e.message}`); }
    });
  }

  await mkdir(FLAGS_DIR, { recursive: true });
  const flagTodo = [];
  for (const code of gridFlags) if (!(await exists(path.join(FLAGS_DIR, `${code}.svg`)))) flagTodo.push(code);
  console.log(`\nFlagi: ${gridFlags.size} potrzebnych, pobieram ${flagTodo.length}.`);
  for (const code of flagTodo) {
    try { await writeFile(path.join(FLAGS_DIR, `${code}.svg`), await fetchBinary(FLAG_URL(code))); report.ok++; }
    catch (e) { report.failed.push(`[flaga] ${code}: ${e.message}`); }
  }

  console.log(`\nGotowe: ${report.ok} plików zapisanych.`);
  if (report.noPage.length) console.log(`Nie znaleziono strony gracza (${report.noPage.length}): ${report.noPage.join(', ')}`);
  if (report.noImage.length) console.log(`Brak zdjęcia na Leaguepedii (${report.noImage.length}): ${report.noImage.join(', ')}`);
  if (report.failed.length) { console.log(`Błędy (${report.failed.length}):\n  ${report.failed.join('\n  ')}`); process.exitCode = 1; }
}

main().catch(e => { console.error('✗ ' + e.message); process.exitCode = 1; });
