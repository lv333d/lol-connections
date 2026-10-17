// Generates daily LoL Grid 3x3 boards: grid/YYYY-MM-DD.json + grid/index.json.
// Usage: npm run generate-grid [-- --date=2026-10-18] [-- --days=14] [-- --force] [-- --min=2]
//   --date   first day to generate (default: today in UTC — boards roll over at 00:00 UTC)
//   --days   how many consecutive days to generate (default 1)
//   --force  overwrite boards that already exist (by default existing days are kept, so players' boards never change)
//   --min    minimum valid players per cell (default 2; the hard requirement is ≥ 1)
//   --recompute  for existing boards in the range: keep the conditions, recompute the answers from the current
//                database (use after fixing data, so a live board accepts every correct player)
// Each board is seeded by its date, so re-running with the same database reproduces the same board.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, DATE_RE } from './lib/puzzles.js';
import { matches, conditionKey, hasDistinctAssignment } from './lib/grid-conditions.js';

const GRID_DIR = path.join(ROOT, 'grid');
const MAX_ATTEMPTS = 20000;
// Cells with more valid answers than this are too trivial (e.g. "retired × LEC").
const MAX_PER_CELL = 120;
// Condition pairs that nearly imply each other make a pointless cell (almost every coach is a retired player).
const REDUNDANT_PAIRS = new Set(['coach|retired', 'retired|coach']);
const TEAM_POOL_SIZE = 40;
const ANCHOR_POOL_SIZE = 60;

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const FORCE = process.argv.includes('--force');
const RECOMPUTE = process.argv.includes('--recompute');
const MIN_PER_CELL = Math.max(1, Number(arg('min')) || 2);
const DAYS = Math.max(1, Number(arg('days')) || 1);
const START = arg('date') || new Date().toISOString().slice(0, 10);
if (!DATE_RE.test(START)) throw new Error('--date musi mieć format YYYY-MM-DD');

/* ---------- seeded RNG ---------- */

function seedFrom(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return h >>> 0;
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

/* ---------- condition pool ---------- */

export function buildPool(players, teams) {
  const pool = [];
  for (const id of ['LCK', 'LPL', 'LEC', 'LCS', 'LTA']) pool.push({ cond: { kind: 'league', id }, weight: 2 });
  teams.slice(0, TEAM_POOL_SIZE).forEach(t => pool.push({
    cond: { kind: 'team', id: t.id, label: t.name, short: t.short, aliases: (t.aliases || []).slice(0, 6) },
    weight: 1.5
  }));
  pool.push({ cond: { kind: 'coach' }, weight: 2 });
  pool.push({ cond: { kind: 'retired' }, weight: 2 });
  for (const id of ['worlds', 'msi', 'first-stand']) pool.push({ cond: { kind: 'trophy', id }, weight: 1.5 });
  [...players].sort((a, b) => b.tournaments - a.tournaments).slice(0, ANCHOR_POOL_SIZE)
    .forEach(p => pool.push({ cond: { kind: 'teammate', playerId: p.id, label: p.nick }, weight: 0.4 }));

  // Precompute matching player ids per condition; drop conditions nobody satisfies.
  for (const e of pool) e.ids = new Set(players.filter(p => matches(p, e.cond)).map(p => p.id));
  return pool.filter(e => e.ids.size >= 3);
}

function weightedPick(rng, pool) {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of pool) if ((r -= e.weight) <= 0) return e;
  return pool[pool.length - 1];
}

// Per-board variety limits: how many conditions of one kind may appear on the whole board.
const KIND_LIMITS = { league: 2, team: 4, coach: 1, retired: 1, trophy: 2, teammate: 2 };

function drawAxes(rng, pool) {
  const chosen = [];
  const keys = new Set();
  const perKind = {};
  for (let guard = 0; chosen.length < 6 && guard < 200; guard++) {
    const e = weightedPick(rng, pool);
    const k = conditionKey(e.cond);
    if (keys.has(k) || (perKind[e.cond.kind] || 0) >= KIND_LIMITS[e.cond.kind]) continue;
    keys.add(k);
    perKind[e.cond.kind] = (perKind[e.cond.kind] || 0) + 1;
    chosen.push(e);
  }
  if (chosen.length < 6 || !perKind.team) return null; // every board features at least one team
  // Shuffle so that same-kind conditions are spread over both axes.
  for (let i = chosen.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [chosen[i], chosen[j]] = [chosen[j], chosen[i]]; }
  return { rows: chosen.slice(0, 3), cols: chosen.slice(3) };
}

/**
 * Solvability check: every cell has between MIN_PER_CELL and MAX_PER_CELL players, no cell pairs
 * redundant conditions, and the 9 cells can be filled with 9 different players.
 */
function evaluate(axes, byId) {
  if (axes.rows.some(r => axes.cols.some(c => REDUNDANT_PAIRS.has(`${r.cond.kind}|${c.cond.kind}`)))) return null;
  const answers = axes.rows.map(r => axes.cols.map(c => {
    const ids = [...r.ids].filter(id => c.ids.has(id));
    return ids.sort((a, b) => byId.get(b).tournaments - byId.get(a).tournaments || a.localeCompare(b));
  }));
  if (answers.flat().some(cell => cell.length < MIN_PER_CELL || cell.length > MAX_PER_CELL)) return null;
  if (!hasDistinctAssignment(answers)) return null;
  return answers;
}

export function generateBoard(date, pool, byId) {
  const rng = mulberry32(seedFrom('lol-grid:' + date));
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const axes = drawAxes(rng, pool);
    if (!axes) continue;
    const answers = evaluate(axes, byId);
    if (answers) return { rows: axes.rows.map(e => e.cond), cols: axes.cols.map(e => e.cond), answers, attempt };
  }
  return null;
}

/* ---------- files ---------- */

async function listGridDates() {
  try { return (await readdir(GRID_DIR)).map(f => f.replace(/\.json$/, '')).filter(d => DATE_RE.test(d)).sort(); }
  catch { return []; }
}

async function rebuildGridManifest() {
  const boards = [];
  for (const date of await listGridDates()) {
    const b = JSON.parse(await readFile(path.join(GRID_DIR, `${date}.json`), 'utf8'));
    boards.push({ date, boardId: b.boardId });
  }
  await writeFile(path.join(GRID_DIR, 'index.json'), JSON.stringify({ boards }, null, 2) + '\n');
}

const addDays = (date, n) => { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const describe = c => c.kind === 'teammate' ? `teammate:${c.playerId}` : c.id ? `${c.kind}:${c.id}` : c.kind;

async function main() {
  const players = JSON.parse(await readFile(path.join(ROOT, 'data', 'players.json'), 'utf8'));
  const teams = JSON.parse(await readFile(path.join(ROOT, 'data', 'teams.json'), 'utf8'));
  const byId = new Map(players.map(p => [p.id, p]));
  const pool = buildPool(players, teams);
  console.log(`Pula warunków: ${pool.length} (min. ${MIN_PER_CELL} graczy na pole)`);

  await mkdir(GRID_DIR, { recursive: true });
  const existing = new Map();
  for (const d of await listGridDates()) existing.set(d, JSON.parse(await readFile(path.join(GRID_DIR, `${d}.json`), 'utf8')).boardId);
  let nextId = Math.max(0, ...existing.values()) + 1;
  let failed = 0;

  for (let i = 0; i < DAYS; i++) {
    const date = addDays(START, i);
    if (existing.has(date) && RECOMPUTE) {
      const file = path.join(GRID_DIR, `${date}.json`);
      const board = JSON.parse(await readFile(file, 'utf8'));
      const answers = board.rows.map(r => board.cols.map(c => players
        .filter(p => matches(p, r) && matches(p, c)).map(p => p.id)
        .sort((a, b) => byId.get(b).tournaments - byId.get(a).tournaments || a.localeCompare(b))));
      // Conditions stay; the board must still be solvable with the current data.
      if (answers.flat().some(cell => cell.length < 1) || !hasDistinctAssignment(answers)) {
        failed++;
        console.error(`✗ ${date}: po przeliczeniu plansza nie jest rozwiązywalna — zostawiam starą wersję`);
        continue;
      }
      const before = board.answers.flat(2).length;
      // Team display data (name, short, former names) may have changed with the database.
      const teamById = new Map(teams.map(t => [t.id, t]));
      const refresh = c => (c.kind === 'team' && teamById.has(c.id)
        ? { ...c, label: teamById.get(c.id).name, short: teamById.get(c.id).short, aliases: (teamById.get(c.id).aliases || []).slice(0, 6) }
        : c);
      await writeFile(file, JSON.stringify({ ...board, rows: board.rows.map(refresh), cols: board.cols.map(refresh), answers }) + '\n');
      console.log(`↻ ${date} #${board.boardId}: odpowiedzi ${before} → ${answers.flat(2).length}`);
      continue;
    }
    if (existing.has(date) && !FORCE) { console.log(`· ${date} już istnieje (#${existing.get(date)}), pomijam`); continue; }
    const result = generateBoard(date, pool, byId);
    if (!result) { failed++; console.error(`✗ ${date}: nie znaleziono rozwiązywalnej planszy w ${MAX_ATTEMPTS} próbach`); continue; }
    const boardId = existing.get(date) ?? nextId++;
    const board = { date, boardId, rows: result.rows, cols: result.cols, answers: result.answers };
    await writeFile(path.join(GRID_DIR, `${date}.json`), JSON.stringify(board) + '\n');
    const counts = result.answers.map(r => r.map(c => c.length).join('/')).join(' | ');
    console.log(`✓ ${date} #${boardId} (próba ${result.attempt})\n    wiersze: ${result.rows.map(describe).join(', ')}\n    kolumny: ${result.cols.map(describe).join(', ')}\n    graczy na pole: ${counts}`);
  }
  await rebuildGridManifest();
  if (failed) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error('✗ ' + e.message); process.exitCode = 1; });
}
