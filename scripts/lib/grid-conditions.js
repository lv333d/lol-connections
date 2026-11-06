// Grid condition semantics shared by the generator (and anything else that needs to validate answers).

/** @typedef {import('../../types/puzzle').Condition} Condition */
/** @typedef {import('../../types/puzzle').Player} Player */

/**
 * Whether `p` meets `c` as a player — what the generator counts towards a cell's minimum. Teams, leagues, trophies
 * and teammates reached only by coaching don't count (outside the "coach" condition itself).
 * @param {Player} p @param {Condition} c
 */
export function matches(p, c) {
  const via = p.viaCoaching || {};
  switch (c.kind) {
    case 'league': return p.leagues.includes(c.id) && !via.leagues?.includes(c.id);
    case 'team': return p.teams.includes(c.id) && !via.teams?.includes(c.id);
    case 'coach': return p.coach;
    case 'retired': return p.retired;
    case 'trophy': return p.trophies.includes(c.id) && !via.trophies?.includes(c.id);
    case 'nationality': return p.nationality === c.id;
    case 'teammate': return p.id !== c.playerId && p.teammates.includes(c.playerId) && !via.teammates?.includes(c.playerId);
    default: return false;
  }
}

/**
 * Whether `p` is an accepted answer for `c`: also as a coach, and a team also through its academy in the region's
 * top tier-2 league (players.json `academyTeams`). The generator picks conditions with matches() only, so these
 * widen the answers without making a cell look playable that isn't.
 * @param {Player} p @param {Condition} c
 */
export function matchesAnswer(p, c) {
  switch (c.kind) {
    case 'league': return p.leagues.includes(c.id);
    case 'team': return p.teams.includes(c.id) || Boolean(p.academyTeams?.includes(c.id));
    case 'trophy': return p.trophies.includes(c.id);
    case 'teammate': return p.id !== c.playerId && p.teammates.includes(c.playerId);
    default: return matches(p, c);
  }
}

/** Accepted answers per cell, best-known players first. @param {Player[]} players */
export function boardAnswers(rows, cols, players) {
  return rows.map(r => cols.map(c => players.filter(p => matchesAnswer(p, r) && matchesAnswer(p, c))
    .sort((a, b) => b.tournaments - a.tournaments || a.id.localeCompare(b.id)).map(p => p.id)));
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
