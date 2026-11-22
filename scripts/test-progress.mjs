// Checks of the streak rules in progress.js (npm test), in a VM with a fake localStorage.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../progress.js', import.meta.url), 'utf8') + '\n;globalThis.PROGRESS = PROGRESS;';
const day = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function load(entries, search = '') {
  const store = new Map(Object.entries(entries).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const localStorage = {
    get length() { return store.size; }, key: i => [...store.keys()][i] ?? null,
    getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v))
  };
  const ctx = { localStorage, location: { search, hostname: '127.0.0.1' }, URLSearchParams, document: { getElementById: () => null } };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.PROGRESS;
}
const grid = (cells, extra = {}) => ({ cells: Array.from({ length: 9 }, (_, i) => (i < cells ? 'p' + i : null)), guessesLeft: 0, wrong: [], gameOver: true, ...extra });
const gp = (n, won, extra = {}) => ({ guesses: Array.from({ length: n }, (_, i) => 'g' + i), gameOver: true, won, ...extra });
const plain = o => ({ ...o });

// 1. Old saves (no finishedOn) on three days in a row → streak 3, played today.
let P = load({ [`lolg_state_${day(0)}`]: grid(9), [`lolg_state_${day(-1)}`]: grid(4), [`lolg_state_${day(-2)}`]: grid(0) });
assert.deepEqual(plain(P.streak('grid')), { current: 3, best: 3, today: true });

// 2. Today not finished yet, the two days before were → still alive (2), today = false.
P = load({ [`lolgp_state_${day(-1)}`]: gp(3, true), [`lolgp_state_${day(-2)}`]: gp(5, false), [`lolgp_state_${day(0)}`]: { guesses: ['x'], gameOver: false, won: false } });
assert.deepEqual(plain(P.streak('guess')), { current: 2, best: 2, today: false });

// 3. A missed day breaks the current streak; the best one is kept.
P = load({ [`lolg_state_${day(-2)}`]: grid(9), [`lolg_state_${day(-3)}`]: grid(9), [`lolg_state_${day(-4)}`]: grid(9) });
assert.deepEqual(plain(P.streak('grid')), { current: 0, best: 3, today: false });

// 4. An archive game finished today (older puzzle) doesn't count.
P = load({ [`lolg_state_${day(-6)}`]: grid(7, { finishedOn: day(0) }) });
assert.deepEqual(plain(P.streak('grid')), { current: 0, best: 0, today: false });

// 5. Each game has its own streak: Grid today and two days ago, Guess yesterday → Grid 1, Guess 1 (never 3 together).
P = load({ [`lolg_state_${day(0)}`]: grid(2, { finishedOn: day(0) }), [`lolgp_state_${day(-1)}`]: gp(1, true), [`lolg_state_${day(-2)}`]: grid(9) });
assert.equal(P.streak('grid').current, 1);
assert.equal(P.streak('guess').current, 1);

// 6. Unreadable saves and other keys are ignored.
P = load({ [`lolg_state_${day(0)}`]: '{not json', lolc_lang: 'pl', lolg_state_bad: grid(9) });
assert.equal(P.streak('grid').current, 0);

// 7. Result line: today's puzzle → next number; an archive date → nothing.
P = load({ [`lolg_state_${day(0)}`]: grid(9) });
assert.equal(P.resultLine('grid', 'pl', day(0), 37), 'Seria: 1 🔥 — wróć jutro po #38');
assert.equal(P.resultLine('grid', 'pl', day(-3), 34), '');

// 8. Admin preview: &streak=5 simulates; without it the preview shows no line.
P = load({}, `?preview=${day(0)}&streak=5`);
assert.equal(P.resultLine('guess', 'en', day(0), 11), 'Streak: 5 🔥 — come back tomorrow for #12');
assert.equal(P.streak('grid').current, 5);
P = load({ [`lolg_state_${day(0)}`]: grid(9) }, `?preview=${day(0)}`);
assert.equal(P.resultLine('grid', 'pl', day(0), 37), '');
console.log('progress.js: 8 scenarios OK');
