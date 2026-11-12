// Picks the daily "Guess the Pro" player: guess/YYYY-MM-DD.json { date, number, playerId } + guess/index.json.
// Usage: npm run generate-guess [-- --days=14]
//   fills every missing day from today up to today + days - 1 (existing days are kept)
//
// The answer is drawn from data/guess-players.json (the same players the game lets you guess), weighted towards
// more international events, and never repeats within REPEAT_DAYS (scripts/lib/guess.js).
import { readPool, readDays, writeDay, rebuildManifest, drawPlayer, addDays, todayKey } from './lib/guess.js';

const days = Number(process.argv.find(a => a.startsWith('--days='))?.split('=')[1]) || 14;

const pool = await readPool();
if (!pool.length) throw new Error('Brak data/guess-players.json — uruchom najpierw npm run build-guess');
const existing = await readDays();
const have = new Set(existing.map(d => d.date));
const added = [];
// A pool refresh can drop a planned player (the pool keeps 2+ international events): redraw those future days.
// Today and past days stay as they are.
const inPool = new Set(pool.map(p => p.id));
for (const d of existing.filter(d => d.date > todayKey() && !inPool.has(d.playerId))) {
  const pick = drawPlayer(pool, existing, d.date, [d.playerId]);
  console.log(`${d.date}: ${d.playerId} nie ma już w puli → ${pick.nick}`);
  d.playerId = pick.id;
  await writeDay(d);
}
for (let i = 0, date = todayKey(); i < days; i++, date = addDays(date, 1)) {
  if (have.has(date)) continue;
  const pick = drawPlayer(pool, [...existing, ...added], date);
  const day = { date, number: 0, playerId: pick.id };
  await writeDay(day);
  added.push(day);
}
const all = await rebuildManifest();
console.log(`guess/: +${added.length} dni, razem ${all.length} (do ${all.at(-1)?.date ?? '—'})`);
const nick = id => pool.find(p => p.id === id)?.nick || id;
if (added.length) console.log(added.map(d => `${d.date} ${nick(d.playerId)}`).join('\n'));
