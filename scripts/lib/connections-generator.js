// Draws a Connections board from data/connections-categories.json (approved players per category).
// Rules: 4 different categories, 4 players each; no player fits another category on the same board (so every
// tile has exactly one answer); players and categories from the neighbouring weeks are avoided when possible.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, DIFFICULTIES, listBoardDates, readBoard, slugify } from './puzzles.js';

const POOL_PATH = path.join(ROOT, 'data', 'connections-categories.json');
// Boards this many days around the target date count as "recent".
const RECENT_DAYS = 28;
const MAX_ATTEMPTS = 3000;
// Difficulty by how well-known a category is: green is the easiest group, purple the trickiest.
const DIFFICULTY_ORDER = ['green', 'yellow', 'blue', 'purple'];

const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const daysBetween = (a, b) => Math.abs(Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000;

/** Players (by name slug) and category keys used by boards near `date`, the board on `date` itself excluded. */
async function recentUsage(date) {
  const players = new Set(), keys = new Set();
  for (const d of await listBoardDates()) {
    if (d === date || daysBetween(d, date) > RECENT_DAYS) continue;
    const b = await readBoard(d);
    for (const c of b.categories) {
      if (c.key) keys.add(c.key);
      c.items.forEach(it => players.add(it.id));
    }
  }
  return { players, keys };
}

/** Picks 4 players per category, or null when some category runs out of safe players. */
function pickPlayers(cats, avoidPlayers, rng) {
  const used = new Set();
  const picked = [];
  for (const cat of cats) {
    const others = cats.filter(c => c !== cat);
    // A player who also fits another category on this board would make that tile ambiguous.
    const safe = cat.players.filter(p => !others.some(o => o.memberSet.has(p.id)) && !used.has(slugify(p.nick)));
    const fresh = safe.filter(p => !avoidPlayers.has(slugify(p.nick)));
    const pool = fresh.length >= 4 ? fresh : safe;
    if (pool.length < 4) return null;
    const four = shuffle(pool, rng).slice(0, 4);
    four.forEach(p => used.add(slugify(p.nick)));
    picked.push(four);
  }
  return picked;
}

/**
 * @param {string} date YYYY-MM-DD the board is for
 * @returns {Promise<{ board: import('../../types/puzzle').ConnectionsBoard, notes: string[] }>}
 */
export async function generateConnectionsBoard(date, rng = Math.random) {
  const { categories } = JSON.parse(await readFile(POOL_PATH, 'utf8'));
  const usable = categories.filter(c => c.players.length >= 4).map(c => ({ ...c, memberSet: new Set(c.members) }));
  if (usable.length < 4) throw new Error('Za mało kategorii z co najmniej 4 zatwierdzonymi graczami.');
  const recent = await recentUsage(date);

  // First try only categories absent from the neighbouring weeks, then allow repeats.
  const freshCats = usable.filter(c => !recent.keys.has(c.key));
  for (const [pool, repeat] of [[freshCats, false], [usable, true]]) {
    if (pool.length < 4) continue;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const cats = shuffle(pool, rng).slice(0, 4);
      const players = pickPlayers(cats, recent.players, rng);
      if (!players) continue;
      // Easiest category first, so it gets green.
      const order = cats.map((c, i) => i).sort((a, b) => cats[a].ease - cats[b].ease || rng() - 0.5);
      const board = {
        date,
        categories: order.map((i, rank) => ({
          key: cats[i].key,
          title: cats[i].title,
          difficulty: DIFFICULTY_ORDER[rank],
          items: players[i].map(p => ({ id: slugify(p.nick), name: p.nick })),
          explain: { pl: players[i].map(p => `${p.nick}: ${p.facts}`).join('. ') + '.' }
        }))
      };
      const reused = board.categories.flatMap(c => c.items).filter(it => recent.players.has(it.id)).map(it => it.name);
      const notes = [];
      if (repeat) notes.push('Brak wystarczającej liczby nowych kategorii — użyto kategorii z ostatnich tygodni.');
      if (reused.length) notes.push(`Gracze z ostatnich tygodni (zabrakło innych): ${reused.join(', ')}.`);
      return { board, notes };
    }
  }
  throw new Error('Nie udało się złożyć planszy z obecnej puli — zatwierdź więcej graczy lub kategorii.');
}

// DIFFICULTIES (validation order) and DIFFICULTY_ORDER must name the same four colours.
if (DIFFICULTY_ORDER.some(d => !DIFFICULTIES.includes(d))) throw new Error('DIFFICULTY_ORDER out of sync with DIFFICULTIES');
