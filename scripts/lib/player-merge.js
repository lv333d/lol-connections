// One person, one record: merges duplicate player records (data/player-merge.json) and fills a missing real name
// from the page's disambiguation ("Faker (Noh Woo-seok)" → "Noh Woo-seok"), so same-nick players can be told
// apart in the search. Used by scripts/build-player-db.js on every build and by scripts/merge-duplicate-players.js
// for the data already in the repo.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const LISTS = ['teams', 'academyTeams', 'leagues', 'trophies', 'teammates', 'nationalities'];
const VIA = ['teams', 'leagues', 'trophies', 'teammates'];

/** { duplicate id → kept id } from data/player-merge.json (empty when the file is missing). */
export async function readMergeMap(root) {
  try {
    const raw = JSON.parse(await readFile(path.join(root, 'data', 'player-merge.json'), 'utf8'));
    return raw.merge || {};
  } catch { return {}; }
}

/** "Faker (Noh Woo-seok)" → "Noh Woo-seok"; "Hope (Wang_Jie)" → "Wang Jie"; no parentheses or a description
 *  instead of a name ("Cupcake (North American Player)", "Horus (LEO Rook)") → ''. */
export const nameFromPage = page => {
  const s = (/\(([^()]+)\)\s*$/.exec(page || '')?.[1] || '').replace(/_/g, ' ').trim();
  return /\b(player|coach|rook|streamer|caster|analyst)\b|\d/i.test(s) ? '' : s;
};

/**
 * Merges each duplicate into its kept record and drops it; every teammate list then points at the kept id.
 * Returns { players, merged: [[dup, kept]], missing: [[dup, kept]] } — missing = a pair not found in the data.
 * A team, league, trophy or teammate counts as reached only by coaching (viaCoaching) when it was so in every
 * record that has it.
 */
export function mergePlayers(players, map) {
  const byId = new Map(players.map(p => [p.id, p]));
  const merged = [], missing = [];
  const canon = id => (map[id] && byId.has(map[id]) ? map[id] : id);
  for (const [dup, kept] of Object.entries(map)) {
    const a = byId.get(kept), b = byId.get(dup);
    if (!a || !b) { missing.push([dup, kept]); continue; }
    const out = { ...a };
    for (const k of LISTS) {
      if (!a[k] && !b[k]) continue;
      out[k] = [...new Set([...(a[k] || []), ...(b[k] || [])])].sort();
    }
    const via = {};
    for (const k of VIA) {
      const only = (out[k] || []).filter(x => [a, b].every(p => !(p[k] || []).includes(x) || (p.viaCoaching?.[k] || []).includes(x)));
      if (only.length) via[k] = only;
    }
    if (Object.keys(via).length) out.viaCoaching = via; else delete out.viaCoaching;
    out.name = a.name || b.name || '';
    out.nationality = a.nationality || b.nationality || '';
    out.coach = Boolean(a.coach || b.coach);
    if (a.coachOnly && b.coachOnly) out.coachOnly = true; else delete out.coachOnly;
    out.tournaments = (a.tournaments || 0) + (b.tournaments || 0);
    byId.set(kept, out);
    byId.delete(dup);
    merged.push([dup, kept]);
  }
  const result = players.filter(p => byId.has(p.id)).map(p => {
    const q = { ...byId.get(p.id) };
    const remap = list => [...new Set(list.map(canon))].filter(id => id !== q.id).sort();
    q.teammates = remap(q.teammates || []);
    if (q.viaCoaching?.teammates) {
      q.viaCoaching = { ...q.viaCoaching, teammates: remap(q.viaCoaching.teammates) };
      if (!q.viaCoaching.teammates.length) delete q.viaCoaching.teammates;
      if (!Object.keys(q.viaCoaching).length) delete q.viaCoaching;
    }
    if (!q.name) q.name = nameFromPage(q.wikiPage);
    return q;
  });
  return { players: result, merged, missing };
}

/** data/players-index.json: the search list, then { id, alias } for every merged id (old saves still resolve). */
export const playerIndex = (players, map) => [
  ...players.map(({ id, nick, name, tournaments }) => ({ id, nick, name, t: tournaments })),
  ...Object.entries(map).filter(([, kept]) => players.some(p => p.id === kept)).map(([id, alias]) => ({ id, alias }))
];
