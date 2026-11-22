// Picks the daily Career Path player: path/YYYY-MM-DD.json { date, number, playerId, career } + path/index.json.
// Usage: npm run generate-path [-- --days=14]
//   fills every missing day from today up to today + days - 1 (existing days are kept); a future day whose player
//   left the pool is drawn again, and so is one whose path changed is refreshed (today and past days stay as they are)
//
// The answer is drawn from data/path-players.json (scripts/build-careers.js), weighted towards more international
// events, never repeating within REPEAT_DAYS and never the Guess the Pro player within GUESS_GAP_DAYS (lib/path.js).
import { readPool, readDays, readGuessDays, writeDay, rebuildManifest, drawPlayer, addDays, todayKey } from './lib/path.js';

const days = Number(process.argv.find(a => a.startsWith('--days='))?.split('=')[1]) || 14;

const pool = await readPool();
if (!pool.length) throw new Error('Brak data/path-players.json — uruchom najpierw npm run build-careers');
const byId = new Map(pool.map(p => [p.id, p]));
const existing = await readDays();
const guessDays = await readGuessDays();
const have = new Set(existing.map(d => d.date));
const added = [];
for (const d of existing.filter(d => d.date > todayKey())) {
  const p = byId.get(d.playerId);
  if (!p) {
    const pick = drawPlayer(pool, existing, guessDays, d.date, [d.playerId]);
    console.log(`${d.date}: ${d.playerId} nie ma już w puli → ${pick.nick}`);
    Object.assign(d, { playerId: pick.id, career: pick.career });
    await writeDay(d);
  } else if (JSON.stringify(p.career) !== JSON.stringify(d.career)) {
    d.career = p.career;
    await writeDay(d);
  }
}
for (let i = 0, date = todayKey(); i < days; i++, date = addDays(date, 1)) {
  if (have.has(date)) continue;
  const pick = drawPlayer(pool, [...existing, ...added], guessDays, date);
  const day = { date, number: 0, playerId: pick.id, career: pick.career };
  await writeDay(day);
  added.push(day);
}
const all = await rebuildManifest();
console.log(`path/: +${added.length} dni, razem ${all.length} (do ${all.at(-1)?.date ?? '—'})`);
if (added.length) console.log(added.map(d => `${d.date} ${byId.get(d.playerId)?.nick} (${d.career.length} drużyn)`).join('\n'));
