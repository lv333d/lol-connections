// Grid condition semantics shared by the generator (and anything else that needs to validate answers).

/** @typedef {import('../../types/puzzle').Condition} Condition */
/** @typedef {import('../../types/puzzle').Player} Player */

/** @param {Player} p @param {Condition} c */
export function matches(p, c) {
  switch (c.kind) {
    case 'league': return p.leagues.includes(c.id);
    case 'team': return p.teams.includes(c.id);
    case 'coach': return p.coach;
    case 'retired': return p.retired;
    case 'trophy': return p.trophies.includes(c.id);
    case 'teammate': return p.id !== c.playerId && p.teammates.includes(c.playerId);
    default: return false;
  }
}

export const conditionKey = c => [c.kind, c.id ?? c.playerId ?? ''].join(':');

/**
 * True when every cell can get a different player (no reuse), via augmenting-path bipartite matching.
 * @param {string[][][]} answers [row][col] → candidate ids
 */
export function hasDistinctAssignment(answers) {
  const cells = answers.flat();
  const owner = new Map(); // player id → cell index
  const tryCell = (ci, seen) => {
    for (const id of cells[ci]) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (!owner.has(id) || tryCell(owner.get(id), seen)) { owner.set(id, ci); return true; }
    }
    return false;
  };
  return cells.every((_, ci) => tryCell(ci, new Set()));
}
