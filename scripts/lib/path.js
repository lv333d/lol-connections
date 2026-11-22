// Career Path days (path/YYYY-MM-DD.json { date, number, playerId, career: [{ id, name, short }] } + path/index.json),
// shared by scripts/generate-path.js and the admin server. The day file carries the path itself, so the game needs
// nothing else (the pool, data/path-players.json, stays private like the full database).
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './puzzles.js';

export const PATH_DIR = path.join(ROOT, 'path');
export const POOL_FILE = path.join(ROOT, 'data', 'path-players.json');
export const CONFIG_FILE = path.join(ROOT, 'data', 'path-config.json');
export const GUESS_DIR = path.join(ROOT, 'guess');
/** A player isn't drawn again within this many days before or after an existing pick. */
export const REPEAT_DAYS = 180;
/** Nor within this many days of being the Guess the Pro player (the admin warns about a hand-picked one). */
export const GUESS_GAP_DAYS = 14;
export const RETIRED_WEIGHT = 0.3;

export const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
export const todayKey = () => new Date().toISOString().slice(0, 10);
const readJson = async (f, fallback) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return fallback; } };

export const readPool = () => readJson(POOL_FILE, []);
export const readConfig = async () => ({ minIntl: 2, ...(await readJson(CONFIG_FILE, {})) });
export const writeConfig = cfg => writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n');

async function readDir(dir) {
  await mkdir(dir, { recursive: true });
  const files = (await readdir(dir)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  return Promise.all(files.map(async f => JSON.parse(await readFile(path.join(dir, f), 'utf8'))));
}
/** Every Career Path day, oldest first. */
export const readDays = () => readDir(PATH_DIR);
/** Guess the Pro days, for the 14-day gap between the two games. */
export const readGuessDays = () => readDir(GUESS_DIR).catch(() => []);

export const writeDay = d => writeFile(path.join(PATH_DIR, `${d.date}.json`), JSON.stringify(d, null, 1) + '\n');

/** Numbers follow date order (#1 = first day); rewrites day files whose number changed and the manifest. */
export async function rebuildManifest() {
  const days = await readDays();
  for (const [i, d] of days.entries()) {
    if (d.number !== i + 1) { d.number = i + 1; await writeDay(d); }
  }
  await writeFile(path.join(PATH_DIR, 'index.json'), JSON.stringify({ days: days.map(d => ({ date: d.date, number: d.number })) }, null, 1) + '\n');
  return days;
}

export async function deleteDay(date) {
  await unlink(path.join(PATH_DIR, `${date}.json`));
  return rebuildManifest();
}

/** Sets the player of a day (creating the day if needed), with their path from the pool. */
export async function setDay(date, playerId, pool) {
  pool ||= await readPool();
  const p = pool.find(x => x.id === playerId);
  if (!p) throw Object.assign(new Error('Gracza nie ma w puli Ścieżki kariery'), { status: 400 });
  await mkdir(PATH_DIR, { recursive: true });
  await writeDay({ date, number: 0, playerId: p.id, career: p.career });
  return rebuildManifest();
}

/** Guess the Pro players within GUESS_GAP_DAYS of `date`. */
export const guessNear = (guessDays, date) =>
  new Set(guessDays.filter(d => Math.abs(Date.parse(d.date) - Date.parse(date)) <= GUESS_GAP_DAYS * 864e5).map(d => d.playerId));

/**
 * A random pool player for `date`, weighted √(international events), retired players RETIRED_WEIGHT as often,
 * skipping anyone picked within REPEAT_DAYS and anyone who is the Guess the Pro player within GUESS_GAP_DAYS.
 */
export function drawPlayer(pool, days, guessDays, date, exclude = []) {
  const near = new Set(days.filter(d => d.date !== date && Math.abs(Date.parse(d.date) - Date.parse(date)) < REPEAT_DAYS * 864e5).map(d => d.playerId));
  const guessed = guessNear(guessDays, date);
  const drawable = pool.filter(p => !exclude.includes(p.id));
  let open = drawable.filter(p => !near.has(p.id) && !guessed.has(p.id));
  if (!open.length) open = drawable.filter(p => !guessed.has(p.id));
  if (!open.length) open = drawable;
  const weights = open.map(p => Math.sqrt(p.intl || 1) * (p.retired ? RETIRED_WEIGHT : 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  return open.find((p, k) => (r -= weights[k]) <= 0) || open.at(-1);
}
