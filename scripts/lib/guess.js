// Guess the Pro days (guess/YYYY-MM-DD.json { date, number, playerId } + guess/index.json), shared by
// scripts/generate-guess.js and the admin server.
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './puzzles.js';

export const GUESS_DIR = path.join(ROOT, 'guess');
export const POOL_FILE = path.join(ROOT, 'data', 'guess-players.json');
/** A player isn't drawn again within this many days before or after an existing pick. */
export const REPEAT_DAYS = 180;
/** Retired players come up this many times less often than active ones with the same number of events. */
export const RETIRED_WEIGHT = 0.3;

export const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
export const todayKey = () => new Date().toISOString().slice(0, 10);

export async function readPool() {
  try { return JSON.parse(await readFile(POOL_FILE, 'utf8')); } catch { return []; }
}

/** Every day file, oldest first. */
export async function readDays() {
  await mkdir(GUESS_DIR, { recursive: true });
  const files = (await readdir(GUESS_DIR)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  return Promise.all(files.map(async f => JSON.parse(await readFile(path.join(GUESS_DIR, f), 'utf8'))));
}

/** Numbers follow date order (#1 = first day); rewrites day files whose number changed and the manifest. */
export async function rebuildManifest() {
  const days = await readDays();
  for (const [i, d] of days.entries()) {
    if (d.number !== i + 1) {
      d.number = i + 1;
      await writeDay(d);
    }
  }
  await writeFile(path.join(GUESS_DIR, 'index.json'), JSON.stringify({ days: days.map(d => ({ date: d.date, number: d.number })) }, null, 1) + '\n');
  return days;
}

export const writeDay = d => writeFile(path.join(GUESS_DIR, `${d.date}.json`), JSON.stringify(d, null, 1) + '\n');

export async function deleteDay(date) {
  await unlink(path.join(GUESS_DIR, `${date}.json`));
  return rebuildManifest();
}

/** Sets the player of a day (creating the day if needed). */
export async function setDay(date, playerId) {
  await mkdir(GUESS_DIR, { recursive: true });
  await writeDay({ date, number: 0, playerId });
  return rebuildManifest();
}

/**
 * A random pool player for `date`, weighted √(international events) so stars come up more often but not every
 * other day, retired players RETIRED_WEIGHT times as often, never a `noDraw` one, skipping anyone picked within REPEAT_DAYS of it (and `exclude`, e.g. the day's current player).
 */
export function drawPlayer(pool, days, date, exclude = []) {
  const near = new Set(days.filter(d => d.date !== date && Math.abs(Date.parse(d.date) - Date.parse(date)) < REPEAT_DAYS * 864e5).map(d => d.playerId));
  const drawable = pool.filter(p => !p.noDraw && !exclude.includes(p.id));
  let open = drawable.filter(p => !near.has(p.id));
  if (!open.length) open = drawable;
  const weights = open.map(p => Math.sqrt(p.intl || 1) * (p.retired ? RETIRED_WEIGHT : 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  return open.find((p, k) => (r -= weights[k]) <= 0) || open.at(-1);
}
