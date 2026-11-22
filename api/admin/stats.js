// GET /api/admin/stats?days=14 — Authorization: Bearer ADMIN_TOKEN (api/_lib/core.js adminStats).
import { adminStats, authorized } from '../_lib/core.js';
import { ctxFor, respond } from '../_lib/vercel.js';

export default async function handler(req, res) {
  if (!authorized(req.headers.authorization, process.env.ADMIN_TOKEN)) return res.status(401).json({ error: 'unauthorized' });
  return respond(res, () => adminStats(req.query, { ...ctxFor(req), ipHash: '' }));
}
