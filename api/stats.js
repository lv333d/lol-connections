// GET /api/stats?mode=grid|guess&date=YYYY-MM-DD — counters for the game (api/_lib/core.js getStats), cached 60 s.
import { getStats } from './_lib/core.js';
import { ctxFor, respond } from './_lib/vercel.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  return respond(res, () => getStats(req.query, ctxFor(req)));
}
