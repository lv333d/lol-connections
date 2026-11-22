// Local stand-in for Upstash Redis (admin server, tests): the same small command set as api/_lib/vercel.js
// redisStore, kept in memory, plus sample counts so the counter can be seen without Vercel.
//   seed(store, level, { root, days }): level 'none' (empty), 'low' (under the default threshold: a few dozen games
//   a day) or 'high' (thousands of games), for today and the days before that have a puzzle.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function memoryStore() {
  const data = new Map();
  const hash = k => { if (!data.has(k)) data.set(k, new Map()); return data.get(k); };
  return {
    data,
    clear: () => data.clear(),
    async sadd(k, m) { if (!data.has(k)) data.set(k, new Set()); const s = data.get(k); if (s.has(m)) return 0; s.add(m); return 1; },
    async hincrby(k, f, n) { const h = hash(k); const v = (Number(h.get(f)) || 0) + n; h.set(f, String(v)); return v; },
    async hgetall(k) { const h = data.get(k); return h instanceof Map ? Object.fromEntries(h) : {}; },
    async hset(k, obj) { const h = hash(k); for (const [f, v] of Object.entries(obj)) h.set(f, String(v)); return Object.keys(obj).length; },
    async incr(k) { const v = (Number(data.get(k)) || 0) + 1; data.set(k, v); return v; },
    async expire() { return 1; }
  };
}

const day = (n = 0) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const readJson = async f => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } };

/** Small deterministic random generator, so a level always gives the same picture. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

export async function seed(store, level, { root, days = 8 } = {}) {
  store.clear();
  if (level === 'none') return { level, days: 0 };
  const rand = rng(level === 'high' ? 7 : 3);
  for (let k = 0; k < days; k++) {
    const date = day(-k);
    const games = level === 'high' ? 1400 + Math.floor(rand() * 1200) : 25 + Math.floor(rand() * 30);
    // Grid: about one in eight fills the whole grid.
    if (await readJson(path.join(root, 'grid', `${date}.json`))) {
      for (let g = 0; g < games; g++) {
        await store.hincrby(`sum:grid:${date}`, 'played', 1);
        if (rand() < 0.12) await store.hincrby(`sum:grid:${date}`, 'won', 1);
      }
    }
    // Guess the Pro: about three in four find the player.
    if (await readJson(path.join(root, 'guess', `${date}.json`))) {
      const n = Math.round(games * 0.8);
      for (let g = 0; g < n; g++) {
        const won = rand() < 0.76;
        await store.hincrby(`sum:guess:${date}`, 'played', 1);
        if (won) await store.hincrby(`sum:guess:${date}`, 'won', 1);
      }
    }
  }
  return { level, days };
}
