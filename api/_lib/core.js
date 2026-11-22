// "N players played today" for both games — the logic shared by the Vercel Functions (api/*.js, Upstash Redis) and the local
// admin server (scripts/admin-server.js, an in-memory store with sample data). No accounts, no personal data:
// a result carries a random device id made in the browser (one result per device, game and day), and requests
// are rate-limited by a salted, daily hash of the IP address — the address itself is never stored.
//
// ctx = { store, loadBoard(mode, date) → board JSON | null, ipHash: string, now?: Date }
// store: sadd(key, member) → 1 | 0, hincrby(key, field, n), hgetall(key) → {}, hset(key, obj), incr(key) → n,
//        expire(key, seconds), pipeline-free; every call is one Redis command.
//
// Keys (all per-day keys expire after RETENTION_DAYS):
//   dev:{mode}:{date}          set of device ids that already sent that day's result
//   sum:{mode}:{date}          hash: played, won
//   rl:{ipHash}:{minute}       rate-limit counter (2 min)
//   config                     hash: showThreshold

export const RETENTION_DAYS = 90;
export const DEFAULT_CONFIG = { showThreshold: 100 };
const RATE_LIMIT = { post: 20, get: 120 };      // per IP hash and minute
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEVICE = /^[a-z0-9-]{16,64}$/i;
const MODES = ['grid', 'guess'];

const day = (now, n = 0) => { const d = new Date(now); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const reply = (status, body, headers = {}) => ({ status, body, headers });
const bad = msg => reply(400, { error: msg });
const keep = RETENTION_DAYS * 86400;

/** Rate limit: false when this IP hash made too many requests of this kind in the current minute. */
async function allowed(ctx, kind) {
  if (!ctx.ipHash) return true;
  const minute = Math.floor((ctx.now || new Date()).getTime() / 60000);
  const key = `rl:${kind}:${ctx.ipHash}:${minute}`;
  const n = await ctx.store.incr(key);
  if (n === 1) await ctx.store.expire(key, 120);
  return n <= RATE_LIMIT[kind];
}

export async function getConfig(store) {
  const raw = await store.hgetall('config');
  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : d);
  return { showThreshold: num(raw?.showThreshold, DEFAULT_CONFIG.showThreshold) };
}

/** POST /api/result — body { mode, date, device, cells? (Grid: 9 × playerId | null), won?, guesses? (Guess) }. */
export async function postResult(body, ctx) {
  if (!(await allowed(ctx, 'post'))) return reply(429, { error: 'Too many requests' });
  const now = ctx.now || new Date();
  const { mode, date, device } = body || {};
  if (!MODES.includes(mode)) return bad('mode');
  if (!DATE.test(date || '') || (date !== day(now) && date !== day(now, -1))) return bad('date');   // today's puzzle (or yesterday's, finished after midnight)
  if (!DEVICE.test(device || '')) return bad('device');
  const board = await ctx.loadBoard(mode, date);
  if (!board) return bad('no puzzle');

  let won;
  if (mode === 'grid') {
    if (!Array.isArray(body.cells) || body.cells.length !== 9) return bad('cells');
    const seen = new Set();
    for (let i = 0; i < 9; i++) {
      const id = body.cells[i];
      if (id === null) continue;
      // Only players that fit the cell, each once — anything else did not come from this board.
      if (typeof id !== 'string' || seen.has(id) || !board.answers?.[Math.floor(i / 3)]?.[i % 3]?.includes(id)) return bad('cells');
      seen.add(id);
    }
    won = seen.size === 9;
  } else {
    const g = body.guesses;
    if (!Number.isInteger(g) || g < 1 || g > 500 || typeof body.won !== 'boolean') return bad('guesses');
    won = body.won;
  }

  // One result per device, game and day.
  const devKey = `dev:${mode}:${date}`;
  if (!(await ctx.store.sadd(devKey, device))) return reply(409, { error: 'already sent' });
  await ctx.store.expire(devKey, 3 * 86400);
  const sumKey = `sum:${mode}:${date}`;
  await ctx.store.hincrby(sumKey, 'played', 1);
  if (won) await ctx.store.hincrby(sumKey, 'won', 1);
  await ctx.store.expire(sumKey, keep);
  return reply(200, { ok: true });
}

async function summary(store, mode, date) {
  const s = await store.hgetall(`sum:${mode}:${date}`);
  const played = Number(s?.played) || 0, won = Number(s?.won) || 0;
  return { played, won, winPct: played ? Math.round(won / played * 100) : 0 };
}

/** GET /api/stats?mode&date — finished games and wins. */
export async function getStats(query, ctx) {
  if (!(await allowed(ctx, 'get'))) return reply(429, { error: 'Too many requests' });
  const { mode, date } = query || {};
  if (!MODES.includes(mode)) return bad('mode');
  if (!DATE.test(date || '')) return bad('date');
  return reply(200, await summary(ctx.store, mode, date), { 'Cache-Control': 'public, max-age=60, s-maxage=60' });
}

/** GET /api/config — the display thresholds the game uses. */
export async function getPublicConfig(ctx) {
  return reply(200, await getConfig(ctx.store), { 'Cache-Control': 'public, max-age=300, s-maxage=300' });
}

/* ---------- Admin (Bearer ADMIN_TOKEN) ---------- */

export const authorized = (header, token) => Boolean(token) && header === `Bearer ${token}`;

/** GET /api/admin/stats?days=14 — finished games per day and game. */
export async function adminStats(query, ctx) {
  const now = ctx.now || new Date();
  const days = Math.min(Math.max(Number(query?.days) || 14, 1), 60);
  const list = [];
  for (let k = 0; k < days; k++) {
    const d = day(now, -k);
    list.push({ date: d, grid: await summary(ctx.store, 'grid', d), guess: await summary(ctx.store, 'guess', d) });
  }
  return reply(200, { days: list, config: await getConfig(ctx.store) });
}

/** PUT /api/admin/config — { showThreshold } (a whole number ≥ 0). */
export async function adminSetConfig(body, ctx) {
  const out = {};
  for (const k of ['showThreshold']) {
    const v = Number(body?.[k]);
    if (!Number.isInteger(v) || v < 0 || v > 1e6) return bad(k);
    out[k] = v;
  }
  await ctx.store.hset('config', out);
  return reply(200, out);
}
