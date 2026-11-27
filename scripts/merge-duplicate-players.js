// One-off (safe to re-run): applies data/player-merge.json and the disambiguation names (scripts/lib/player-merge.js)
// to the data already in the repo, without fetching anything from Leaguepedia:
//   data/players.json, data/players-index.json  — one record per person, alias entries for the old ids
//   grid/*.json                                 — every cell that accepted either id accepts the kept id (once);
//                                                  a cell the merged record now fits (e.g. team of one record ×
//                                                  teammate of the other) gets it too; "played with <dup>" axes
//                                                  point at the kept id
// Usage: node scripts/merge-duplicate-players.js [--dry]
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/puzzles.js';
import { readMergeMap, mergePlayers, playerIndex } from './lib/player-merge.js';
import { matchesAnswer } from './lib/grid-conditions.js';

const dry = process.argv.includes('--dry');
const readJson = async f => JSON.parse(await readFile(path.join(ROOT, f), 'utf8'));
const map = await readMergeMap(ROOT);
const before = await readJson('data/players.json');
const { players, merged, missing } = mergePlayers(before, map);
if (missing.length) console.log(`(już scalone albo brak w danych: ${missing.map(([d, k]) => `${d}→${k}`).join(', ')})`);
console.log(`scalone: ${merged.map(([d, k]) => `${d}→${k}`).join(', ') || '—'}`);
const named = players.filter(p => p.name && !before.find(b => b.id === p.id)?.name);
console.log(`nazwiska z nazwy strony: ${named.length} (${named.slice(0, 12).map(p => `${p.nick}=${p.name}`).join(', ')}…)`);

const byId = new Map(players.map(p => [p.id, p]));
const canon = id => (map[id] && byId.has(map[id]) ? map[id] : id);

let changedBoards = 0;
const gridDir = path.join(ROOT, 'grid');
for (const f of (await readdir(gridDir)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) {
  const file = path.join(gridDir, f);
  const raw = await readFile(file, 'utf8');
  const b = JSON.parse(raw);
  const notes = [];
  for (const c of [...b.rows, ...b.cols]) {
    if (c.kind === 'teammate' && canon(c.playerId) !== c.playerId) { notes.push(`oś ${c.playerId}→${canon(c.playerId)}`); c.playerId = canon(c.playerId); }
  }
  b.answers = b.answers.map((row, r) => row.map((cell, c) => {
    const ids = [...new Set(cell.map(canon))];
    for (const [, kept] of merged) {
      const p = byId.get(kept);
      if (!ids.includes(kept) && matchesAnswer(p, b.rows[r]) && matchesAnswer(p, b.cols[c])) { ids.push(kept); notes.push(`+${kept} [${r},${c}]`); }
    }
    if (ids.length === cell.length && ids.every((id, i) => id === cell[i])) return cell; // untouched cells keep their order
    if (!notes.some(n => n.endsWith(`[${r},${c}]`))) notes.push(`[${r},${c}] ${cell.filter(id => canon(id) !== id).join(',')}→${cell.filter(id => canon(id) !== id).map(canon).join(',')}`);
    return ids.sort((x, y) => (byId.get(y)?.tournaments || 0) - (byId.get(x)?.tournaments || 0) || x.localeCompare(y));
  }));
  const out = JSON.stringify(b);
  if (out !== JSON.stringify(JSON.parse(raw))) {
    changedBoards++;
    console.log(`grid/${f}: ${notes.join('; ')}`);
    // Keep the file's own formatting style (one line or indented).
    if (!dry) await writeFile(file, (raw.trimStart().startsWith('{\n') ? JSON.stringify(b, null, 2) : out) + (raw.endsWith('\n') ? '\n' : ''));
  }
}
console.log(`plansz Grida zmienionych: ${changedBoards}`);

if (!dry) {
  await writeFile(path.join(ROOT, 'data', 'players.json'), JSON.stringify(players) + '\n');
  await writeFile(path.join(ROOT, 'data', 'players-index.json'), JSON.stringify(playerIndex(players, map)) + '\n');
  console.log('✓ data/players.json, data/players-index.json');
} else console.log('(--dry: nic nie zapisano)');
