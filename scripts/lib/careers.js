// Career paths for "Ścieżka kariery" (Career Path): each player's teams in order, from Leaguepedia.
//
// Source: the Cargo table Tenures — one row per stint with the real join/leave dates (contract dates, not tournament
// dates), joined with RosterChanges for the role of the stint. Chosen over RosterChanges alone (raw join/leave
// events to pair up — Tenures is that pairing already) and TournamentPlayers (tournament dates, plus All-Star,
// national and stand-in teams). See also data/careers.json.
//
// A path is built from playing stints only (Top, Jungle, Mid, Bot, Support — never coach, streamer, content creator…),
// and only the tier-1 part of a career: a stint is tier 1 when the player played a major-league tournament (LCK, LPL,
// LEC, LCS, LTA and their former names) for that organization during it (TournamentPlayers + Tournaments dates);
// everything from the first to the last tier-1 stint stays (a drop to a lower league and back is kept), the rest
// before and after goes. Then:
//   1. each team name becomes its organization (data/teams.json names, pages and aliases: Gamers2 → G2 Esports,
//      CLG Prime → Counter Logic Gaming); a team outside teams.json keeps its own name;
//   2. stints at the same organization less than MERGE_GAP_DAYS apart become one (role changes, sister rosters);
//   3. a stint inside another organization's stint is a loan or a trial and goes;
//   4. stints shorter than MIN_DAYS go (a current one stays);
//   5. what's left, in order of the first day, with neighbours at the same organization joined.
import { cargoQuery, cargoStr } from './leaguepedia.js';
import { slugify } from './puzzles.js';

const time = d => Date.parse((d || '').slice(0, 10) + 'T00:00:00Z');
/** Academy and second rosters by name (T1 Academy, KT Rolster Challengers, Fnatic.Beta, EDward Gaming Youth Team…). */
const ACADEMY_NAME = /(^|[\s.])(academy|rookies|challengers?|beta|youth|young|junior|next|potential)(\s+team)?$/i;
/** Adds a merged stint's time per team name to a block (all names, and the tier-1 ones apart). */
const addNames = (block, s) => {
  for (const key of ['names', 't1names']) for (const [n, t] of Object.entries(s[key])) block[key][n] = (block[key][n] || 0) + t;
  block.tier1 ||= s.tier1;
};
const copyNames = s => ({ ...s, names: { ...s.names }, t1names: { ...s.t1names } });

/** Every league tournament (primary and secondary leagues) of these players: Map(page lower-case → [{ team, start, end, league }]). */
export async function fetchLeagueRosters(pages, { fresh = false } = {}) {
  const out = new Map();
  for (let i = 0; i < pages.length; i += 40) {
    const batch = pages.slice(i, i + 40);
    const rows = await cargoQuery({
      tables: 'TournamentPlayers=TP,Tournaments=T,Leagues=L', joinOn: 'TP.OverviewPage=T.OverviewPage,T.League=L.League',
      fields: 'TP.Link=Link,TP.Team=Team,T.DateStart=DateStart,T.Date=DateEnd,T.League=LeagueName,L.League_Short=LeagueShort',
      where: `TP.Link IN (${batch.map(cargoStr).join(',')}) AND T.TournamentLevel IN ('Primary','Secondary')`, fresh
    });
    for (const r of rows) {
      const start = time(r.DateStart || r.DateEnd), end = time(r.DateEnd || r.DateStart);
      const league = r.LeagueShort || r['League Short'] || r.LeagueName;
      if (!Number.isFinite(start) || !league) continue;
      const key = r.Link.toLowerCase();
      if (!out.has(key)) out.set(key, []);
      out.get(key).push({ team: r.Team, start, end, league });
    }
  }
  return out;
}

/** The league a non-tier-1 path entry played in: the most frequent one of the player's tournaments for that
 *  organization during the entry ("LFL" for Rekkles at Karmine Corp, "LCK CL" at T1 Esports Academy). */
export function leagueOf(entry, rosters, orgOf, today = new Date().toISOString().slice(0, 10)) {
  const from = time(entry.from), to = entry.to ? time(entry.to) : time(today);
  const count = new Map();
  for (const r of rosters) {
    if (r.end < from || r.start > to || (orgOf(r.team)?.id || slugify(r.team)) !== entry.org) continue;
    // A domestic league, not a cup next to it (European Masters, kickoffs, show matches, international events).
    if (/masters|kickoff|showmatch|all-?star|msi|worlds|world championship|first stand|iem|rift rivals/i.test(r.league)) continue;
    count.set(r.league, (count.get(r.league) || 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

export const PLAYER_ROLES = new Set(['Top', 'Jungle', 'Mid', 'Bot', 'Support']);
// Tier 1 in the Career Path: the four top leagues and the LCP, with their former names (Leaguepedia league names).
// Not the Grid's/Guess the Pro's majors: LTA South (the former CBLOL) is out, the LCP family is in.
export const MAJOR_LEAGUES = [
  'LoL Champions Korea', 'LoL The Champions',                                                  // LCK, OGN Champions
  'Tencent LoL Pro League',                                                                    // LPL
  'LoL EMEA Championship', 'Europe League Championship Series',                                // LEC, EU LCS
  'League of Legends Championship Series', 'North America League Championship Series',         // LCS, NA LCS
  'League of Legends Championship of The Americas North', 'League of Legends Championship of The Americas', // LTA North (2025 LCS), LTA finals
  'League of Legends Championship Pacific', 'Pacific Championship Series', 'LoL Master Series' // LCP, PCS, LMS
];
// Qualifiers, promotion and relegation tournaments carry the league's name but are not playing in it.
const NOT_IN_LEAGUE = "T.OverviewPage NOT LIKE '%Qualifier%' AND T.OverviewPage NOT LIKE '%Promotion%' AND T.OverviewPage NOT LIKE '%Relegation%'";

/** Every player's major-league tournaments: Map(player page lower-case → [{ team, start, end }]) (ms timestamps). */
export async function fetchMajorRosters({ fresh = false } = {}) {
  const rows = await cargoQuery({
    tables: 'TournamentPlayers=TP,Tournaments=T', joinOn: 'TP.OverviewPage=T.OverviewPage',
    fields: 'TP.Link=Link,TP.Team=Team,T.DateStart=DateStart,T.Date=DateEnd',
    where: `T.League IN (${MAJOR_LEAGUES.map(cargoStr).join(',')}) AND T.TournamentLevel='Primary' AND ${NOT_IN_LEAGUE} AND TP.Link IS NOT NULL AND TP.Team IS NOT NULL`,
    orderBy: 'TP.Link,T.DateStart', fresh
  });
  const out = new Map();
  for (const r of rows) {
    const start = time(r.DateStart || r.DateEnd), end = time(r.DateEnd || r.DateStart);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const key = r.Link.toLowerCase();
    if (!out.has(key)) out.set(key, []);
    out.get(key).push({ team: r.Team, start, end });
  }
  return out;
}
export const MERGE_GAP_DAYS = 31;
export const MIN_DAYS = 30;
const DAY = 864e5;

/** Leaguepedia pages → their Tenures rows with the role: Map(page lower-case → [{ team, join, leave, current, roles }]). */
export async function fetchTenures(pages, { fresh = false } = {}) {
  const out = new Map();
  for (let i = 0; i < pages.length; i += 40) {
    const batch = pages.slice(i, i + 40);
    const rows = await cargoQuery({
      tables: 'Tenures=T,RosterChanges=RC', joinOn: 'T.RosterChangeIdJoin=RC.RosterChangeId',
      fields: 'T.Player=Player,T.Team=Team,T.DateJoin=DateJoin,T.DateLeave=DateLeave,T.IsCurrent=IsCurrent,RC.Roles=Roles',
      where: `T.Player IN (${batch.map(cargoStr).join(',')})`, orderBy: 'T.Player,T.DateJoin', fresh
    });
    for (const r of rows) {
      const key = (r.Player || '').toLowerCase();
      if (!out.has(key)) out.set(key, []);
      out.get(key).push({ team: r.Team, join: r.DateJoin || '', leave: r.DateLeave || '', current: r.IsCurrent === '1', roles: r.Roles || '' });
    }
  }
  return out;
}

/**
 * One player's path: [{ id, org, name, t1, from, to, before?, after? }] (to = '' for the current team; t1 = a tier-1
 * stint; before on the first entry / after on the last one: the player also played before / after the tier-1 part). Stints are joined by organization,
 * but each circle shows the team as the player played for it: the Leaguepedia name they had in it the longest
 * (Incredible Miracle, not DRX; SK Telecom T1 2, not T1) — `id` is that name's slug (its logo file), `org` the
 * organization's id.
 * orgOf(teamName) → { id, name, short } | undefined (the organization in data/teams.json).
 * majors: the player's major-league tournaments ({ team, start, end }, fetchMajorRosters) — the tier-1 test.
 */
export function careerOf(rows, orgOf, majors = [], today = new Date().toISOString().slice(0, 10)) {
  const stints = [];
  for (const r of rows) {
    if (!r.roles.split(',').map(s => s.trim()).some(role => PLAYER_ROLES.has(role))) continue;
    const start = time(r.join);
    if (!Number.isFinite(start)) continue;
    const end = r.leave ? time(r.leave) : r.current ? time(today) : start;
    if (!Number.isFinite(end) || end < start) continue;
    const org = orgOf(r.team);
    const id = org?.id || slugify(r.team);
    // Tier 1: a major-league tournament for this organization overlapping the stint — never for an academy roster,
    // even when its player stood in for the main team (an academy between tier-1 stints still stays, see 0).
    const tier1 = !ACADEMY_NAME.test(r.team)
      && majors.some(m => m.end >= start && m.start <= end && (orgOf(m.team)?.id || slugify(m.team)) === id);
    stints.push({ id, start, end, current: r.current && !r.leave, tier1, names: { [r.team]: end - start }, t1names: tier1 ? { [r.team]: end - start } : {} });
  }
  // 0. Only from the first to the last tier-1 stint.
  const top = stints.filter(s => s.tier1);
  if (!top.length) return [];
  const first = Math.min(...top.map(s => s.start)), last = Math.max(...top.map(s => s.end));
  // Was there a career before the first / after the last tier-1 stint? (Shown as "…" at that end of the path.)
  const long = s => s.end - s.start >= MIN_DAYS * DAY;
  let before = stints.some(s => s.start < first && long(s));
  let after = stints.some(s => s.end > last && s.start > first && long(s));
  stints.splice(0, stints.length, ...stints.filter(s => s.start >= first && s.end <= last));
  // 2. Same organization, close together → one stint.
  const byOrg = new Map();
  for (const s of stints.sort((a, b) => a.start - b.start)) {
    const list = byOrg.get(s.id) || byOrg.set(s.id, []).get(s.id);
    const last = list.at(-1);
    if (last && s.start - last.end <= MERGE_GAP_DAYS * DAY) { last.end = Math.max(last.end, s.end); last.current ||= s.current; addNames(last, s); }
    else list.push(copyNames(s));
  }
  let blocks = [...byOrg.values()].flat();
  // 3. Loans and trials inside another organization's stint.
  blocks = blocks.filter(b => !blocks.some(o => o !== b && o.id !== b.id && o.start <= b.start && o.end >= b.end && (o.end - o.start) > (b.end - b.start)));
  // 4. Short stints.
  blocks = blocks.filter(b => b.current || b.end - b.start >= MIN_DAYS * DAY);
  // 5. In order; neighbours at the same organization joined.
  const path = [];
  for (const b of blocks.sort((a, c) => a.start - c.start)) {
    const last = path.at(-1);
    if (last && last.id === b.id) { last.end = Math.max(last.end, b.end); last.current ||= b.current; addNames(last, b); continue; }
    path.push(copyNames(b));
  }
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const out = path.map(b => {
    // The name the player had the longest at this organization — among the tier-1 rosters when there were any, so
    // an academy alongside the main team never names the circle (Noah: KT Rolster, not KT Rolster Challengers).
    const pool = Object.keys(b.t1names).length ? b.t1names : b.names;
    const name = Object.entries(pool).sort((x, y) => y[1] - x[1])[0][0];
    return { id: slugify(name), org: b.id, name, t1: b.tier1, from: iso(b.start), to: b.current ? '' : iso(b.end) };
  });
  // A non-tier-1 team can end up at an end when the tier-1 stint before / after it was too short to keep (Quid: a few
  // weeks on Gen.G's main roster, then Gen.G Challengers) — it goes there too, shown as the dashed line.
  let lead = 0, tail = 0;
  while (out.length && !out[0].t1) { out.shift(); lead++; }
  while (out.length && !out.at(-1).t1) { out.pop(); tail++; }
  before ||= lead > 0;
  after ||= tail > 0;
  if (out.length && before) out[0].before = true;
  if (out.length && after) out.at(-1).after = true;
  return out;
}
