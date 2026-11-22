// GET /api/config — display thresholds set in the admin panel (api/_lib/core.js getPublicConfig).
import { getPublicConfig } from './_lib/core.js';
import { ctxFor, respond } from './_lib/vercel.js';

export default async function handler(req, res) {
  return respond(res, () => getPublicConfig(ctxFor(req)));
}
