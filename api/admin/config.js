// PUT /api/admin/config — { showThreshold }; Authorization: Bearer ADMIN_TOKEN (api/_lib/core.js).
import { adminSetConfig, authorized } from '../_lib/core.js';
import { ctxFor, respond, bodyOf } from '../_lib/vercel.js';

export default async function handler(req, res) {
  if (!authorized(req.headers.authorization, process.env.ADMIN_TOKEN)) return res.status(401).json({ error: 'unauthorized' });
  if (req.method !== 'PUT') return res.status(405).json({ error: 'PUT only' });
  return respond(res, () => adminSetConfig(bodyOf(req), { ...ctxFor(req), ipHash: '' }));
}
