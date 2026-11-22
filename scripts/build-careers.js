// Builds data/careers.json — every player's team path (scripts/lib/careers.js) — and the Career Path pool,
// data/path-players.json. Kept out of players.json, which stays as small as the game's other data needs.
// Usage: npm run build-careers [-- --fresh]     (run by build-player-db.js at its end; on its own after build-guess)
//
// careers.json: { playerId: [{ id, org, name, short, from, to }] }   (to = '' for the current team; the tier-1 part only)
// path-players.json: Career Path pool — Guess the Pro pool players (players only, never coaches) with at least
//   minIntl international events (data/path-config.json, set in the admin panel; the Guess the Pro pool itself
//   starts at 2) and a path of MIN_TEAMS…MAX_TEAMS teams: [{ id, nick, name, intl, retired, career: [{ id, name, short }] }]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, slugify } from './lib/puzzles.js';
import { cargoQuery, cargoStr } from './lib/leaguepedia.js';
import { fetchTenures, fetchMajorRosters, fetchLeagueRosters, leagueOf, careerOf } from './lib/careers.js';

export const MIN_TEAMS = 4;
export const MAX_TEAMS = 12;
const DATA_DIR = path.join(ROOT, 'data');
const readJson = async (f, fallback) => { try { return JSON.parse(await readFile(path.join(DATA_DIR, f), 'utf8')); } catch { return fallback; } };

export async function buildCareers({ fresh = false } = {}) {
  const db = await readJson('players.json', []);
  const teams = await readJson('teams.json', []);
  const overrides = await readJson('team-overrides.json', {});
  if (!db.length) throw new Error('Brak data/players.json — uruchom najpierw npm run build-players');

  // Leaguepedia team name → organization (same rule as build-guess-pool.js).
  const orgByName = new Map();
  for (const t of teams) [t.page, t.name, ...(t.aliases || [])].forEach(n => orgByName.set(String(n).toLowerCase(), t));
  for (const [org, names] of Object.entries(overrides.merge || {})) {
    const t = orgByName.get(org.toLowerCase());
    if (t) names.forEach(n => orgByName.set(n.toLowerCase(), t));
  }
  const baseOrg = name => orgByName.get((name || '').toLowerCase());
  // Career Path only: academies and sister rosters count as their organization (Fnatic.Beta, T1 Academy,
  // T1 Esports Academy, T1 Rookies → Fnatic / T1) — the Grid keeps them apart, so this is not in "merge".
  // team-overrides.json "pathMerge" lists the ones the name doesn't give away, and sponsor renames Leaguepedia
  // doesn't link (HUYA Tigers → KOO Tigers → ROX Tigers): { "Organization": ["Team"…] }.
  const pathMerge = new Map(Object.entries(overrides.pathMerge || {}).flatMap(([org, names]) => names.map(n => [n.toLowerCase(), org])));
  // A team tag that only one organization uses ("CLG", "LNG") finds it too.
  const byShort = new Map();
  for (const t of teams) { const k = String(t.short || '').toLowerCase(); if (k) byShort.set(k, byShort.has(k) ? null : t); }
  const ACADEMY = /^(.*\S)[\s.]+(?:global academy|game academy|academy|rookies|challengers|beta|youth|young|junior|next|potential)$/i;
  const known = name => {
    const n = (name || '').trim();
    return baseOrg(n) || baseOrg(n.replace(/\s+(esports|gaming)$/i, '')) || baseOrg(n + ' Esports') || baseOrg(n + ' Gaming') || byShort.get(n.toLowerCase()) || null;
  };
  // Only a known parent organization takes the academy in; otherwise the name stays as it is ("Royal Youth" is a
  // team of its own, not an academy of a "Royal").
  const orgOf = name => {
    const merged = pathMerge.get((name || '').toLowerCase());
    // An organization outside teams.json still joins its names (Qiao Gu Reapers → QG Reapers).
    if (merged) return baseOrg(merged) || { id: slugify(merged), name: merged, short: '' };
    const m = ACADEMY.exec((name || '').trim());
    return (m && known(m[1])) || baseOrg(name);
  };

  console.log(`\n▶ Ścieżki karier: Tenures dla ${db.length} graczy`);
  const tenures = await fetchTenures(db.map(p => p.wikiPage), { fresh });
  console.log('  turnieje lig głównych (test tier 1)…');
  const majors = await fetchMajorRosters({ fresh });
  const careers = {};
  for (const p of db) {
    const c = careerOf(tenures.get(p.wikiPage.toLowerCase()) || [], orgOf, majors.get(p.wikiPage.toLowerCase()) || []);
    if (c.length) careers[p.id] = c;
  }
  // Short names of the teams as they were (Teams table: "IM" for Incredible Miracle); a current organization's
  // name keeps the tag from teams.json.
  const names = [...new Set(Object.values(careers).flat().map(t => t.name))];
  const shortOf = new Map(teams.map(t => [t.name, t.short]));
  for (let i = 0; i < names.length; i += 100) {
    const batch = names.slice(i, i + 100).filter(n => !shortOf.has(n));
    if (!batch.length) continue;
    (await cargoQuery({ tables: 'Teams', fields: 'Name,Short', where: `Name IN (${batch.map(cargoStr).join(',')})`, fresh }))
      .forEach(r => { if (r.Short && !shortOf.has(r.Name)) shortOf.set(r.Name, r.Short); });
  }
  // Shown names: the panel's labels (Evil Geniuses.NA → Evil Geniuses) and no Leaguepedia region suffix (.NA, .CN…:
  // once a team exists in one region only, the plain name is enough); the tag from pathShort when Leaguepedia has
  // none or just repeats the name. The id — the logo file — stays the Leaguepedia name's slug.
  const REGION = /\.(NA|EU|CN|KR|HK|TW|BR|TR|VN|JP|OCE|LAT)$/i;
  const shown = n => overrides.labels?.[n] || n.replace(REGION, '');
  for (const c of Object.values(careers)) c.forEach(t => {
    const short = overrides.pathShort?.[t.name] || shortOf.get(t.name) || '';
    t.short = short === t.name ? shown(short) : short;
    t.name = shown(t.name);
  });
  // The league of every non-tier-1 team kept between tier-1 ones (shown in the game: Karmine Corp · LFL).
  const pageOf = new Map(db.map(p => [p.id, p.wikiPage]));
  const lower = Object.keys(careers).filter(id => careers[id].some(t => !t.t1));
  console.log(`  ligi drużyn spoza tier 1 (${lower.length} graczy)…`);
  const rosters = await fetchLeagueRosters(lower.map(id => pageOf.get(id)), { fresh });
  for (const id of lower) {
    const own = rosters.get(pageOf.get(id).toLowerCase()) || [];
    careers[id].forEach(t => { if (!t.t1) t.league = leagueOf(t, own, orgOf); });
  }
  await writeFile(path.join(DATA_DIR, 'careers.json'), JSON.stringify(careers) + '\n');
  console.log(`  data/careers.json: ${Object.keys(careers).length} graczy ze ścieżką`);
  return careers;
}

export async function buildPathPool(careers) {
  careers ||= await readJson('careers.json', {});
  const guessPool = await readJson('guess-players.json', []);
  const { minIntl = 2 } = await readJson('path-config.json', {});
  const pool = guessPool
    .filter(p => (p.intl || 0) >= minIntl)
    .map(p => ({ id: p.id, nick: p.nick, name: p.name, intl: p.intl, retired: Boolean(p.retired),
      career: (careers[p.id] || []).map(({ id, name, short, league, before, after }) =>
        ({ id, name, short, ...(league ? { league } : {}), ...(before ? { before } : {}), ...(after ? { after } : {}) })) }))
    .filter(p => p.career.length >= MIN_TEAMS && p.career.length <= MAX_TEAMS);
  await writeFile(path.join(DATA_DIR, 'path-players.json'), JSON.stringify(pool, null, 1) + '\n');
  const skipped = guessPool.filter(p => (p.intl || 0) >= minIntl).length - pool.length;
  console.log(`  data/path-players.json: ${pool.length} graczy (próg ${minIntl}+ turniejów międzynarodowych, ${MIN_TEAMS}–${MAX_TEAMS} drużyn; pominięto ${skipped})`);
  return pool;
}

// Run directly (npm run build-careers), not when imported by build-player-db.js, build-guess-pool.js or the admin.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/build-careers.js')) {
  const careers = await buildCareers({ fresh: process.argv.includes('--fresh') });
  await buildPathPool(careers);
}
