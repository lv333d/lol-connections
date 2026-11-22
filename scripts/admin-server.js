// Local-only admin server: serves the site and an API for the games — the daily LoL Grid boards (grid/*.json,
// normally made by the GitHub bot: view, delete, draw a new one) and the daily Guess the Pro players (guess/*.json:
// view, pick, draw, delete, fill the next days) — plus the player database refresh and git sync/publish.
// Usage: npm run admin   →   http://127.0.0.1:4321/admin.html
// Reads ADMIN_PORT from .env.local. Binds to 127.0.0.1 only — never deploy this.
import http from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT, DATE_RE } from './lib/puzzles.js';
import { rebuildGridManifest } from './generate-grid.js';
import * as guess from './lib/guess.js';
import * as careerPath from './lib/path.js';
import { buildPathPool, MIN_TEAMS, MAX_TEAMS } from './build-careers.js';
import * as live from '../api/_lib/core.js';
import { memoryStore, seed as seedStats } from './lib/stats-mock.js';

const GRID_DIR = path.join(ROOT, 'grid');

try { process.loadEnvFile(path.join(ROOT, '.env.local')); } catch { /* optional */ }

const PORT = Number(process.env.ADMIN_PORT) || 4321;
const MAX_BODY = 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};
const BLOCKED_DIRS = new Set(['node_modules', 'scripts', '.cache']);

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(Object.assign(new Error('Invalid JSON body'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname).replace(/^\/+/, '');
  // Clean URLs like on the live site (vercel.json cleanUrls): /guess → guess.html.
  if (!path.extname(rel) && /^[\w-]+$/.test(rel)) rel += '.html';
  const file = path.resolve(ROOT, rel);
  const top = rel.split(/[\\/]/)[0];
  if (!file.startsWith(ROOT + path.sep) || top.startsWith('.') || BLOCKED_DIRS.has(top)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

/* ---------- LoL Grid ---------- */

/** Grid boards as the admin shows them: conditions plus the number of valid players per cell. */
async function gridBoards() {
  let manifest;
  try { manifest = JSON.parse(await readFile(path.join(GRID_DIR, 'index.json'), 'utf8')); }
  catch { return []; }
  return Promise.all(manifest.boards.map(async ({ date, boardId }) => {
    try {
      const b = JSON.parse(await readFile(path.join(GRID_DIR, `${date}.json`), 'utf8'));
      return { date, boardId, rows: b.rows, cols: b.cols, counts: b.answers.map(r => r.map(c => c.length)) };
    } catch {
      return { date, boardId, missing: true };
    }
  }));
}

const run = promisify(execFile);
const node = (script, args, timeout) => run(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { cwd: ROOT, windowsHide: true, timeout });

async function deleteGridBoard(date) {
  try { await unlink(path.join(GRID_DIR, `${date}.json`)); }
  catch { throw Object.assign(new Error('Brak planszy Grida'), { status: 404 }); }
  await rebuildGridManifest();
}

/** Draws a different board for the day (random --variant), then fetches portraits of players it introduces. */
async function regenerateGridBoard(date) {
  try {
    await node('generate-grid.js', [`--date=${date}`, '--days=1', '--force', `--variant=${randomBytes(4).toString('hex')}`], 180000);
  } catch (e) {
    throw Object.assign(new Error('Generator Grida nie znalazł planszy: ' + (e.stderr || e.message).trim().split('\n').at(-1)), { status: 500 });
  }
  let assets = 'zdjęcia graczy pobrane';
  // Needs Leaguepedia credentials in .env.local; without photos the game shows initials, so this is best effort.
  try { await node('fetch-assets.js', [], 180000); } catch { assets = 'nie udało się pobrać zdjęć nowych graczy (gra pokaże inicjały)'; }
  const board = (await gridBoards()).find(b => b.date === date);
  return { board, message: `Nowa plansza Grida na ${date} (#${board?.boardId}); ${assets}.` };
}

/* ---------- Guess the Pro ---------- */

/** Days with their player's card, plus the pool for the "pick a player" search. */
async function guessDays() {
  const [days, pool] = await Promise.all([guess.readDays(), guess.readPool()]);
  const byId = new Map(pool.map(p => [p.id, p]));
  const card = p => p && { id: p.id, nick: p.nick, name: p.name, nat: p.nat, league: p.league === 'other' ? `inna (${p.leagueName || '?'})` : p.league, team: p.team?.short || null, titles: p.titles, debut: p.debut, intl: p.intl };
  return {
    days: days.map(d => ({ date: d.date, number: d.number, playerId: d.playerId, player: card(byId.get(d.playerId)) })),
    pool: pool.map(p => ({ id: p.id, nick: p.nick, name: p.name, intl: p.intl }))
  };
}

async function guessPick(date, playerId) {
  const pool = await guess.readPool();
  if (!pool.some(p => p.id === playerId)) throw Object.assign(new Error('Tego gracza nie ma w puli Guess the Pro'), { status: 400 });
  await guess.setDay(date, playerId);
  return { message: `${date}: ${pool.find(p => p.id === playerId).nick}` };
}

/** Another random player for the day (never the current one, none picked within REPEAT_DAYS). */
async function guessDraw(date) {
  const [pool, days] = await Promise.all([guess.readPool(), guess.readDays()]);
  if (!pool.length) throw Object.assign(new Error('Brak data/guess-players.json — uruchom npm run build-guess'), { status: 500 });
  const current = days.find(d => d.date === date)?.playerId;
  const pick = guess.drawPlayer(pool, days, date, current ? [current] : []);
  await guess.setDay(date, pick.id);
  return { message: `Wylosowano na ${date}: ${pick.nick}` };
}

async function guessFill(count) {
  const days = Math.min(60, Math.max(1, Number(count) || 14));
  const { stdout } = await node('generate-guess.js', [`--days=${days}`], 60000);
  return { message: stdout.trim().split('\n')[0] };
}

/* ---------- Career Path ---------- */

/** Days with their player and path, the pool, the threshold, and the days whose player is also the Guess the Pro
 *  player within GUESS_GAP_DAYS (a warning in the panel). */
async function pathDays() {
  const [days, pool, cfg, guessDays] = await Promise.all([careerPath.readDays(), careerPath.readPool(), careerPath.readConfig(), careerPath.readGuessDays()]);
  const byId = new Map(pool.map(p => [p.id, p]));
  const guessById = new Map(guessDays.map(d => [d.date, d.playerId]));
  return {
    config: { ...cfg, minTeams: MIN_TEAMS, maxTeams: MAX_TEAMS, guessGap: careerPath.GUESS_GAP_DAYS },
    days: days.map(d => {
      const near = guessDays.filter(g => g.playerId === d.playerId && Math.abs(Date.parse(g.date) - Date.parse(d.date)) <= careerPath.GUESS_GAP_DAYS * 864e5).map(g => g.date);
      return { date: d.date, number: d.number, playerId: d.playerId, nick: byId.get(d.playerId)?.nick || d.playerId, inPool: byId.has(d.playerId), career: d.career, guessNear: near, guessThatDay: guessById.get(d.date) || null };
    }),
    pool: pool.map(p => ({ id: p.id, nick: p.nick, name: p.name, intl: p.intl, teams: p.career.length }))
  };
}

async function pathPick(date, playerId) {
  await careerPath.setDay(date, playerId);
  const pool = await careerPath.readPool();
  return { message: `${date}: ${pool.find(p => p.id === playerId)?.nick || playerId}` };
}

async function pathDraw(date) {
  const [pool, days, guessDays] = await Promise.all([careerPath.readPool(), careerPath.readDays(), careerPath.readGuessDays()]);
  if (!pool.length) throw Object.assign(new Error('Brak data/path-players.json — uruchom npm run build-careers'), { status: 500 });
  const current = days.find(d => d.date === date)?.playerId;
  const pick = careerPath.drawPlayer(pool, days, guessDays, date, current ? [current] : []);
  await careerPath.setDay(date, pick.id, pool);
  return { message: `Wylosowano na ${date}: ${pick.nick}` };
}

async function pathFill(count) {
  const days = Math.min(60, Math.max(1, Number(count) || 14));
  const { stdout } = await node('generate-path.js', [`--days=${days}`], 60000);
  return { message: stdout.trim().split('\n')[0] };
}

/** New threshold (international events): saved, the pool rebuilt from data/careers.json; future days of players
 *  that left the pool are drawn again by "fill". */
async function pathSetConfig(body) {
  const minIntl = Number(body?.minIntl);
  if (!Number.isInteger(minIntl) || minIntl < 2 || minIntl > 50) throw Object.assign(new Error('Próg: liczba całkowita od 2 (pula Guess the Pro zaczyna się od 2)'), { status: 400 });
  await careerPath.writeConfig({ ...(await careerPath.readConfig()), minIntl });
  const pool = await buildPathPool();
  return { message: `Próg ${minIntl}+: w puli ${pool.length} graczy`, pool: pool.length };
}

/* ---------- Player database refresh ---------- */

// The same steps as the monthly GitHub bot (.github/workflows/refresh-players.yml). The first one is required
// (~30–60 min: Leaguepedia rate-limits Cargo queries); the others may fail without stopping the rest.
const REFRESH_STEPS = [
  { label: 'Baza graczy z Leaguepedii', script: 'build-player-db.js', args: () => ['--fresh'], required: true },
  { label: 'Pula Guess the Pro', script: 'build-guess-pool.js', args: () => ['--fresh'] },
  { label: 'Gracze dnia Guess the Pro (14 dni)', script: 'generate-guess.js', args: () => ['--days=14'] },
  { label: 'Ścieżka kariery (14 dni)', script: 'generate-path.js', args: () => ['--days=14'] },
  { label: 'Odpowiedzi przyszłych plansz Grida', script: 'generate-grid.js', args: () => [`--date=${guess.addDays(guess.todayKey(), 1)}`, '--days=14', '--recompute'] },
  { label: 'Zdjęcia, loga i flagi', script: 'fetch-assets.js', args: () => [] }
];
const refresh = { running: false, stopped: false, step: -1, steps: [], log: [], startedAt: null, finishedAt: null, child: null };
const dbUpdated = () => { try { return statSync(path.join(ROOT, 'data', 'players.json')).mtime.toISOString(); } catch { return null; } };
const refreshState = () => ({ dbUpdated: dbUpdated(), running: refresh.running, step: refresh.step, steps: refresh.steps, log: refresh.log.slice(-60), startedAt: refresh.startedAt, finishedAt: refresh.finishedAt });

function runStep(step) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts', step.script), ...step.args()], { cwd: ROOT, windowsHide: true });
    refresh.child = child;
    const onData = buf => {
      // Progress lines end with \r ("partia 3/12\r"): keep the latest one instead of piling them up.
      for (const line of buf.toString('utf8').split(/\r?\n|\r/).map(l => l.trimEnd()).filter(Boolean)) refresh.log.push(line);
      if (refresh.log.length > 400) refresh.log.splice(0, refresh.log.length - 400);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', code => { refresh.child = null; resolve(code === 0); });
    child.on('error', e => { refresh.log.push('✗ ' + e.message); refresh.child = null; resolve(false); });
  });
}

async function startRefresh() {
  if (refresh.running || refresh.child) return refreshState(); // a stopped step may still be shutting down
  Object.assign(refresh, { running: true, stopped: false, step: 0, log: [], startedAt: new Date().toISOString(), finishedAt: null,
    steps: REFRESH_STEPS.map(s => ({ label: s.label, status: 'czeka' })) });
  (async () => {
    for (const [i, step] of REFRESH_STEPS.entries()) {
      refresh.step = i;
      refresh.steps[i].status = 'trwa';
      refresh.log.push(`▶ ${step.label}`);
      const ok = await runStep(step);
      if (refresh.stopped) break; // stopRefresh() already marked the steps
      refresh.steps[i].status = ok ? 'gotowe' : 'błąd';
      if (!ok && step.required) {
        refresh.steps.slice(i + 1).forEach(s => { s.status = 'pominięte'; });
        break;
      }
    }
    refresh.running = false;
    refresh.finishedAt = new Date().toISOString();
  })();
  return refreshState();
}

function stopRefresh() {
  if (!refresh.running) return refreshState();
  refresh.running = false;
  refresh.stopped = true;
  refresh.steps.forEach((st, i) => { if (i === refresh.step) st.status = 'przerwane'; else if (i > refresh.step) st.status = 'pominięte'; });
  refresh.finishedAt = new Date().toISOString();
  refresh.log.push('■ Przerwano');
  refresh.child?.kill();
  return refreshState();
}

/* ---------- Git: sync and publishing ---------- */

// A desktop shortcut inherits Explorer's PATH, which may predate the Git install — fall back to the default location.
const GIT = process.env.GIT_PATH
  || [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'cmd', 'git.exe')].find(p => existsSync(p))
  || 'git';
const git = (...args) => run(GIT, args, { cwd: ROOT, windowsHide: true }).then(r => r.stdout.trim());

// Board folders per game; portraits and logos go along with Grid boards that introduce new players.
const GAME_DIRS = { 'grid/': 'Grid', 'guess/': 'Guess the Pro', 'path/': 'Ścieżka kariery' };
const PUBLISH_PATHS = ['grid/', 'guess/', 'path/', 'players/', 'assets/logos/', 'assets/flags/', 'data/'];
// Database files a refresh rewrites; published together with the boards.
const DATA_FILES = ['data/players.json', 'data/players-index.json', 'data/teams.json', 'data/guess-players.json', 'data/careers.json', 'data/path-players.json', 'data/path-config.json'];

/** Board files changed since the last commit: { game, date, change: 'nowa' | 'zmieniona' | 'usunięta' }. */
async function pendingBoards() {
  const out = await git('status', '--porcelain', '--', ...Object.keys(GAME_DIRS));
  return out.split('\n').filter(Boolean).map(line => {
    const code = line.slice(0, 2);
    const file = line.slice(3).trim();
    const date = file.match(/(\d{4}-\d{2}-\d{2})\.json/)?.[1];
    const game = Object.entries(GAME_DIRS).find(([dir]) => file.startsWith(dir))?.[1];
    return date && game && { game, date, change: code.includes('D') ? 'usunięta' : code.includes('?') || code.includes('A') ? 'nowa' : 'zmieniona' };
  }).filter(Boolean).concat(await pendingData(), await pendingSite());
}

// Site settings edited in the admin (footer links); published with the boards.
const SITE_CONFIG = 'data/site-config.json';
const SITE_CONFIG_KEYS = ['tiktok', 'discord'];

async function readSiteConfig() {
  let cfg = {};
  try { cfg = JSON.parse(await readFile(path.join(ROOT, SITE_CONFIG), 'utf8')); } catch { /* none yet */ }
  return Object.fromEntries(SITE_CONFIG_KEYS.map(k => [k, typeof cfg[k] === 'string' ? cfg[k] : '']));
}

/** Footer links: empty (hidden on the site) or an https:// address. */
async function saveSiteConfig(body) {
  const cfg = {};
  for (const k of SITE_CONFIG_KEYS) {
    const v = typeof body?.[k] === 'string' ? body[k].trim() : '';
    if (v && !/^https:\/\/[^\s"<>]+$/i.test(v)) throw Object.assign(new Error(`Link ${k}: podaj adres zaczynający się od https:// albo zostaw puste`), { status: 400 });
    cfg[k] = v;
  }
  await writeFile(path.join(ROOT, SITE_CONFIG), JSON.stringify(cfg, null, 2) + '\n');
  return cfg;
}

/** One entry when the site settings differ from the last commit. */
async function pendingSite() {
  const changed = (await git('status', '--porcelain', '--', SITE_CONFIG)).trim();
  return changed ? [{ game: 'Strona', date: '', change: 'linki w stopce' }] : [];
}

/** One entry when the player database differs from the last commit (after a refresh). */
async function pendingData() {
  const changed = (await git('status', '--porcelain', '--', ...DATA_FILES)).split('\n').filter(Boolean).length;
  return changed ? [{ game: 'Baza graczy', date: '', change: `zaktualizowana (${changed} plików)` }] : [];
}

/** Pulls what the Grid bot (or another computer) pushed, so the panel starts from the live boards. */
async function sync() {
  try {
    const before = await git('rev-parse', 'HEAD');
    await git('pull', '--rebase', '--autostash');
    const after = await git('rev-parse', 'HEAD');
    if (before === after) return { updated: false, message: 'Plansze aktualne — zgodne z GitHubem.' };
    const changed = (await git('diff', '--name-only', before, after, '--', ...Object.keys(GAME_DIRS))).split('\n').filter(Boolean).length;
    return { updated: true, message: `Pobrano zmiany z GitHuba (${changed} plików plansz).` };
  } catch (e) {
    throw Object.assign(new Error('Nie udało się pobrać zmian z GitHuba: ' + (e.stderr || e.message).trim()), { status: 502 });
  }
}

/** Commits board changes of the games (and a refreshed database) and pushes; the hosting deploys the push automatically. */
async function publish() {
  const boards = await pendingBoards();
  if (!boards.length) return { published: [], message: 'Brak zmian do opublikowania.' };
  await git('add', '--all', '--', ...PUBLISH_PATHS);
  const summary = Object.values(GAME_DIRS).map(game => {
    const dates = boards.filter(b => b.game === game).map(b => b.date).sort();
    return dates.length && `${game} ${dates.length === 1 ? dates[0] : `${dates[0]} … ${dates.at(-1)}`} (${dates.length})`;
  }).concat(boards.some(b => b.game === 'Baza graczy') ? ['baza graczy'] : []).filter(Boolean).join(', ');
  await git('commit', '-m', `Plansze: ${summary}`);
  try {
    await git('pull', '--rebase', '--autostash'); // the weekly Grid bot may have pushed in the meantime
    await git('push');
  } catch (e) {
    throw Object.assign(new Error('Commit zrobiony, ale wysyłka na GitHuba nie powiodła się: ' + (e.stderr || e.message).trim()), { status: 502 });
  }
  return { published: boards, message: `Opublikowano: ${summary}. Strona zaktualizuje się za ok. minutę.` };
}

/* ---------- Player counters (stage 4) ---------- */

// The game served here talks to the same /api/result, /api/stats, /api/config as on Vercel, backed by an in-memory
// store with sample data (admin: "Statystyki" → none / low / high). The admin's statistics can instead come from
// the live site: ADMIN_TOKEN (and optionally STATS_URL, default https://connect4.lol) in .env.local — the token
// stays on this server.
const statsStore = memoryStore();
let statsLevel = 'none';
const STATS_URL = (process.env.STATS_URL || 'https://connect4.lol').replace(/\/+$/, '');
const localCtx = req => ({
  store: statsStore,
  ipHash: '',   // no rate limit locally
  loadBoard: async (mode, date) => { try { return JSON.parse(await readFile(path.join(ROOT, mode, `${date}.json`), 'utf8')); } catch { return null; } }
});
const sendLive = (res, out) => send(res, out.status, out.body);

async function remoteAdmin(pathAndQuery, method = 'GET', body) {
  if (!process.env.ADMIN_TOKEN) throw Object.assign(new Error('Brak ADMIN_TOKEN w .env.local — dane na żywo niedostępne'), { status: 400 });
  const r = await fetch(`${STATS_URL}/api/admin/${pathAndQuery}`, {
    method, headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw Object.assign(new Error(`${STATS_URL}: ${data.error || r.status}`), { status: 502 });
  return data;
}

async function handleLive(req, res, pathname, query) {
  if (pathname === '/api/result' && req.method === 'POST') return sendLive(res, await live.postResult(await readBody(req), localCtx(req))), true;
  if (pathname === '/api/stats' && req.method === 'GET') return sendLive(res, await live.getStats(query, localCtx(req))), true;
  if (pathname === '/api/config' && req.method === 'GET') return sendLive(res, await live.getPublicConfig(localCtx(req))), true;
  const remote = query.source === 'live';
  if (pathname === '/api/admin/stats' && req.method === 'GET') {
    if (remote) return send(res, 200, { ...(await remoteAdmin(`stats?days=${encodeURIComponent(query.days || 14)}&date=${encodeURIComponent(query.date || '')}`)), source: 'live' }), true;
    return send(res, 200, { ...(await live.adminStats(query, localCtx(req))).body, source: 'local', level: statsLevel, liveAvailable: Boolean(process.env.ADMIN_TOKEN), liveUrl: STATS_URL }), true;
  }
  if (pathname === '/api/admin/config' && req.method === 'PUT') {
    const body = await readBody(req);
    if (remote) return send(res, 200, await remoteAdmin('config', 'PUT', body)), true;
    return sendLive(res, await live.adminSetConfig(body, localCtx(req))), true;
  }
  if (pathname === '/api/admin/seed' && req.method === 'POST') {
    const { level } = await readBody(req);
    if (!['none', 'low', 'high'].includes(level)) return send(res, 400, { error: 'level' }), true;
    const cfg = await live.getConfig(statsStore);
    await seedStats(statsStore, level, { root: ROOT });
    await statsStore.hset('config', cfg);   // keep the thresholds set in the panel
    statsLevel = level;
    return send(res, 200, { ok: true, level }), true;
  }
  return false;
}

/* ---------- API ---------- */

async function handleApi(req, res, pathname, query = {}) {
  if (await handleLive(req, res, pathname, query)) return;
  if (pathname === '/api/publish' && req.method === 'GET') {
    return send(res, 200, { pending: await pendingBoards() });
  }
  if (pathname === '/api/publish' && req.method === 'POST') {
    return send(res, 200, await publish());
  }
  if (pathname === '/api/site-config' && req.method === 'GET') return send(res, 200, await readSiteConfig());
  if (pathname === '/api/site-config' && req.method === 'PUT') return send(res, 200, await saveSiteConfig(await readBody(req)));
  if (pathname === '/api/sync' && req.method === 'POST') {
    return send(res, 200, await sync());
  }
  if (pathname === '/api/grid' && req.method === 'GET') {
    return send(res, 200, { boards: await gridBoards() });
  }
  const gm = pathname.match(/^\/api\/grid\/([^/]+)(\/generate)?$/);
  if (gm) {
    if (!DATE_RE.test(gm[1])) return send(res, 400, { error: 'Nieprawidłowa data' });
    if (gm[2] && req.method === 'POST') return send(res, 200, await regenerateGridBoard(gm[1]));
    if (!gm[2] && req.method === 'DELETE') { await deleteGridBoard(gm[1]); return send(res, 200, { ok: true }); }
  }
  if (pathname === '/api/refresh' && req.method === 'GET') return send(res, 200, refreshState());
  if (pathname === '/api/refresh' && req.method === 'POST') return send(res, 200, await startRefresh());
  if (pathname === '/api/refresh/stop' && req.method === 'POST') return send(res, 200, stopRefresh());
  if (pathname === '/api/guess' && req.method === 'GET') {
    return send(res, 200, await guessDays());
  }
  if (pathname === '/api/guess/fill' && req.method === 'POST') {
    return send(res, 200, await guessFill((await readBody(req)).days));
  }
  const gp = pathname.match(/^\/api\/guess\/([^/]+)(\/draw)?$/);
  if (gp) {
    if (!DATE_RE.test(gp[1])) return send(res, 400, { error: 'Nieprawidłowa data' });
    if (gp[2] && req.method === 'POST') return send(res, 200, await guessDraw(gp[1]));
    if (!gp[2] && req.method === 'PUT') return send(res, 200, await guessPick(gp[1], (await readBody(req)).playerId));
    if (!gp[2] && req.method === 'DELETE') {
      try { await guess.deleteDay(gp[1]); } catch { return send(res, 404, { error: 'Brak dnia Guess the Pro' }); }
      return send(res, 200, { ok: true });
    }
  }
  if (pathname === '/api/path' && req.method === 'GET') return send(res, 200, await pathDays());
  if (pathname === '/api/path/fill' && req.method === 'POST') return send(res, 200, await pathFill((await readBody(req)).days));
  if (pathname === '/api/path/config' && req.method === 'PUT') return send(res, 200, await pathSetConfig(await readBody(req)));
  const pp = pathname.match(/^\/api\/path\/([^/]+)(\/draw)?$/);
  if (pp) {
    if (!DATE_RE.test(pp[1])) return send(res, 400, { error: 'Nieprawidłowa data' });
    if (pp[2] && req.method === 'POST') return send(res, 200, await pathDraw(pp[1]));
    if (!pp[2] && req.method === 'PUT') return send(res, 200, await pathPick(pp[1], (await readBody(req)).playerId));
    if (!pp[2] && req.method === 'DELETE') {
      try { await careerPath.deleteDay(pp[1]); } catch { return send(res, 404, { error: 'Brak dnia Ścieżki kariery' }); }
      return send(res, 200, { ok: true });
    }
  }
  return send(res, 404, { error: 'Unknown endpoint' });
}

const server = http.createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, 'http://localhost');
  try {
    if (pathname.startsWith('/api/')) await handleApi(req, res, pathname, Object.fromEntries(searchParams));
    else await serveStatic(req, res, pathname);
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, { error: e.message });
  }
});
// Started twice (e.g. the desktop shortcut clicked again): the panel is already up, nothing to do.
server.on('error', e => {
  if (e.code !== 'EADDRINUSE') throw e;
  console.log(`Panel już działa: http://127.0.0.1:${PORT}/admin.html`);
  process.exit(0);
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Admin:  http://127.0.0.1:${PORT}/admin.html`);
  console.log(`Gra:    http://127.0.0.1:${PORT}/`);
});
