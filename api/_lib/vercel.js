// Vercel side of the counters: the Upstash Redis store (REST API, no client library), the board loader and the
// request plumbing for api/*.js. Files under api/_lib are not routes.
//
// Environment (Vercel → Project → Settings → Environment Variables):
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN   (or KV_REST_API_URL / KV_REST_API_TOKEN from the Vercel
//                                                       marketplace integration — either pair works)
//   ADMIN_TOKEN                                        long random string for the admin endpoints
//   IP_SALT                                            long random string for the IP hash (optional: ADMIN_TOKEN)
import { createHash } from 'node:crypto';

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(...command) {
  if (!URL_ || !TOKEN) throw new Error('Redis is not configured');
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Redis ${res.status}`);
  return data.result;
}

/** HGETALL comes back as [field, value, field, value…]. */
const pairs = arr => {
  const o = {};
  for (let i = 0; i + 1 < (arr || []).length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
};

export const redisStore = {
  sadd: (k, m) => redis('SADD', k, m),
  hincrby: (k, f, n) => redis('HINCRBY', k, f, n),
  hgetall: async k => pairs(await redis('HGETALL', k)),
  hset: (k, obj) => redis('HSET', k, ...Object.entries(obj).flat().map(String)),
  incr: k => redis('INCR', k),
  expire: (k, s) => redis('EXPIRE', k, s)
};

/** The board as the site serves it (grid/<date>.json, guess/<date>.json), from this deployment. */
export async function loadBoard(req, mode, date) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    const res = await fetch(`https://${host}/${mode === 'grid' ? 'grid' : 'guess'}/${date}.json`);
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

/** Salted hash of the client IP, changing every day; only kept as a 2-minute rate-limit key. */
export function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
  const salt = process.env.IP_SALT || process.env.ADMIN_TOKEN || 'lolc';
  return createHash('sha256').update(`${salt}:${new Date().toISOString().slice(0, 10)}:${ip}`).digest('hex').slice(0, 24);
}

export const ctxFor = req => ({ store: redisStore, loadBoard: (mode, date) => loadBoard(req, mode, date), ipHash: ipHash(req) });

/** Sends a core.js reply; any failure (Redis down…) is a 503 the game ignores. */
export async function respond(res, fn) {
  try {
    const out = await fn();
    for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v);
    if (!out.headers?.['Cache-Control']) res.setHeader('Cache-Control', 'no-store');
    res.status(out.status).json(out.body);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'unavailable' });
  }
}

export function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}
