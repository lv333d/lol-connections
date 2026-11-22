// Checks of the "players played today" server logic (api/_lib/core.js) on the in-memory store (npm test).
import assert from 'node:assert/strict';
import * as core from '../api/_lib/core.js';
import { memoryStore } from './lib/stats-mock.js';

const today = new Date().toISOString().slice(0, 10);
const old = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 3); return d.toISOString().slice(0, 10); })();
const board = { answers: [[['a', 'b'], ['c'], ['d']], [['e'], ['f', 'a'], ['g']], [['h'], ['i'], ['j', 'k']]] };
const store = memoryStore();
const ctx = (extra = {}) => ({ store, ipHash: '', loadBoard: async (mode, date) => (date === today ? (mode === 'grid' ? board : { playerId: 'x' }) : null), ...extra });
const dev = n => `device-${String(n).padStart(12, '0')}`;
const grid = (cells, device = dev(1), date = today) => core.postResult({ mode: 'grid', date, device, cells }, ctx());

// Valid Grid results are counted; the same device can't send twice for the same game and day.
assert.equal((await grid(['a', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])).status, 200);
assert.equal((await grid(['a', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])).status, 409);
assert.equal((await grid(['b', null, null, null, 'a', null, null, null, null], dev(2))).status, 200);
assert.equal((await grid(Array(9).fill(null), dev(3))).status, 200);   // gave up without a cell: still played

// Results that don't match the board are refused: a player outside the cell, one player twice, wrong length,
// another day than today/yesterday, an unknown game, a bad device id.
assert.equal((await grid(['c', null, null, null, null, null, null, null, null], dev(4))).status, 400);
assert.equal((await grid(['a', null, null, null, 'a', null, null, null, null], dev(4))).status, 400);
assert.equal((await grid(['a'], dev(4))).status, 400);
assert.equal((await grid(Array(9).fill(null), dev(4), old)).status, 400);
assert.equal((await core.postResult({ mode: 'chess', date: today, device: dev(4) }, ctx())).status, 400);
assert.equal((await grid(Array(9).fill(null), 'x')).status, 400);

// Stats: 3 games, 1 full grid; nothing per cell.
let s = (await core.getStats({ mode: 'grid', date: today }, ctx())).body;
assert.deepEqual(s, { played: 3, won: 1, winPct: 33 });

// Guess the Pro.
assert.equal((await core.postResult({ mode: 'guess', date: today, device: dev(1), guesses: 4, won: true }, ctx())).status, 200);
assert.equal((await core.postResult({ mode: 'guess', date: today, device: dev(2), guesses: 0, won: true }, ctx())).status, 400);
s = (await core.getStats({ mode: 'guess', date: today }, ctx())).body;
assert.deepEqual(s, { played: 1, won: 1, winPct: 100 });

// Rate limit per IP hash: 20 results a minute, then 429.
const rl = ctx({ ipHash: 'abc' });
let last;
for (let i = 0; i < 21; i++) last = await core.postResult({ mode: 'guess', date: today, device: dev(100 + i), guesses: 2, won: false }, rl);
assert.equal(last.status, 429);

// Threshold: default, then the admin's value; bad values refused.
assert.deepEqual((await core.getPublicConfig(ctx())).body, core.DEFAULT_CONFIG);
assert.equal((await core.adminSetConfig({ showThreshold: 5 }, ctx())).status, 200);
assert.deepEqual((await core.getPublicConfig(ctx())).body, { showThreshold: 5 });
assert.equal((await core.adminSetConfig({ showThreshold: -1 }, ctx())).status, 400);

// Admin: finished games per day.
const a = (await core.adminStats({ days: 3 }, ctx())).body;
assert.equal(a.days.length, 3); assert.equal(a.days[0].grid.played, 3); assert.equal(a.days[0].guess.played, 21);
assert.equal(core.authorized('Bearer t0k', 't0k'), true);
assert.equal(core.authorized('Bearer t0k', ''), false);
console.log('api/_lib/core.js: counters OK');
