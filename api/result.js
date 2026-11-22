// POST /api/result — a finished game's result (api/_lib/core.js postResult).
import { postResult } from './_lib/core.js';
import { ctxFor, respond, bodyOf } from './_lib/vercel.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  return respond(res, () => postResult(bodyOf(req), ctxFor(req)));
}
