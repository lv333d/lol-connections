// Picks the daily "Guess the Pro" player: guess/YYYY-MM-DD.json { date, number, playerId } + guess/index.json.
// Usage: npm run generate-guess [-- --days=30]   (adds days after the last existing one, or from today)
//
// The answer is drawn from data/guess-players.json players with at least MIN_INTL international events (the
// well-known ones; every pool player can still be guessed), weighted towards more events, and never repeats
// within REPEAT_DAYS.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/puzzles.js';

const DIR = path.join(ROOT, 'guess');
const MIN_INTL = 3;
const REPEAT_DAYS = 180;
const days = Number(process.argv.find(a => a.startsWith('--days='))?.split('=')[1]) || 30;

const pool = JSON.parse(await readFile(path.join(ROOT, 'data', 'guess-players.json'), 'utf8'));
const candidates = pool.filter(p => p.intl >= MIN_INTL);
await mkdir(DIR, { recursive: true });

const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const existing = [];
for (const f of (await readdir(DIR)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) {
  existing.push(JSON.parse(await readFile(path.join(DIR, f), 'utf8')));
}
const today = new Date().toISOString().slice(0, 10);
let date = existing.length ? addDays(existing.at(-1).date, 1) : today;
let number = existing.length ? existing.at(-1).number + 1 : 1;

const recent = existing.map(d => d.playerId);
const added = [];
for (let i = 0; i < days; i++, date = addDays(date, 1), number++) {
  const blocked = new Set(recent.slice(-REPEAT_DAYS));
  const open = candidates.filter(p => !blocked.has(p.id));
  // Weight √events: stars come up more often, but not every other day.
  const weights = open.map(p => Math.sqrt(p.intl));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  const pick = open.find((p, k) => (r -= weights[k]) <= 0) || open.at(-1);
  const day = { date, number, playerId: pick.id };
  await writeFile(path.join(DIR, `${date}.json`), JSON.stringify(day, null, 1) + '\n');
  recent.push(pick.id);
  added.push(day);
}

const all = [...existing, ...added];
await writeFile(path.join(DIR, 'index.json'), JSON.stringify({ days: all.map(d => ({ date: d.date, number: d.number })) }, null, 1) + '\n');
console.log(`guess/: +${added.length} dni (${added[0]?.date} … ${added.at(-1)?.date}), razem ${all.length}`);
console.log(added.map(d => `${d.date} ${pool.find(p => p.id === d.playerId).nick}`).join('\n'));
