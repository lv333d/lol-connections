// Candidate lists for data-driven Connections categories, read from Leaguepedia. The output is for review
// (the swipe page), never published as-is: every list is checked by hand before it goes into a puzzle.
// Usage: npm run connections-candidates -- <category|all> [--min=2] [--fame=2] [--team=gen-g] [--fresh]
// Output: console list + .cache/connections-candidates/<category>.json
//
// Every candidate carries "fame": the number of international events (Worlds / MSI / First Stand, one per year)
// the player attended — a proxy for how well an average viewer knows them. --fame drops players below it.
//
// Categories:
//   nick-change        played in a major league / international event under at least two different nicknames.
//                      Spelling-only changes (Caps → caPs, "NUCLEAR INT" → NuclearINT) do not count, nor do names used
//                      only before reaching a major league. Rosters that list the real name instead of a nick are
//                      skipped. --min = tournaments needed under each nick. "extended": one nick contains another.
//   role-swap          played at least two positions in major leagues / international events, --min tournaments each.
//   three-regions      played in at least three of LCK, LPL, LEC, LCS (LTA North counts as LCS).
//   one-club           every major-league / international roster as a player was for one organization (teams.json
//                      aliases join renames like SK Telecom T1 → T1). Stints outside those leagues are not seen.
//                      --min = tournaments needed.
//   player-to-coach    played, later coached in a major league. Leaguepedia rosters say "Coach" for head and
//                      assistant coaches alike, so head coaches are picked by hand.
//   msi-multi          won MSI at least twice as a player (on the winning roster).
//   msi-winner         won MSI as a player (on the winning roster).
//   first-stand-winner won First Stand as a player (on the winning roster).
//   lck-champion, lpl-champion, lec-champion, lcs-champion
//                      won the league as a player (on the winning roster): split playoffs and season finals; before
//                      2015 the OGN Champions events as a whole. LTA North counts as LCS. Regular seasons, Road to
//                      MSI, Play-Ins, LCS Lock In and LCK Cup are not titles.
//   worlds-winner      won Worlds as a player (on the winning roster, final played or not).
//   worlds-and-msi     won both Worlds and MSI as a player.
//   worlds-final-both  played a Worlds final on the winning side and, in another year, on the losing side.
//   worlds-no-final    on a Worlds-winning roster but did not play in that year's final.
//   finals-mvp         Worlds Finals MVP (Leaguepedia MatchSchedule.MVP; years without the field are reported).
//   team               played (not coached) for an organization, --team=<id from data/teams.json>, default gen-g.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/puzzles.js';
import { cargoQuery, cargoStr, login } from './lib/leaguepedia.js';

const OUT_DIR = path.join(ROOT, '.cache', 'connections-candidates');
const fresh = process.argv.includes('--fresh');
const opt = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const MIN = Number(opt('min') ?? 2);
const FAME = Number(opt('fame') ?? 2);

// Same league scope as build-player-db.js: the five major leagues (all historical names) + international events.
const SHORT = {
  'LoL Champions Korea': 'LCK', 'LoL The Champions': 'LCK', 'Tencent LoL Pro League': 'LPL', 'LoL EMEA Championship': 'LEC',
  'Europe League Championship Series': 'LEC', 'League of Legends Championship Series': 'LCS', 'North America League Championship Series': 'LCS',
  'League of Legends Championship of The Americas North': 'LCS', 'League of Legends Championship of The Americas': 'LTA',
  'League of Legends Championship of The Americas South': 'LTA', 'World Championship': 'Worlds', 'Mid-Season Invitational': 'MSI',
  'First Stand': 'First Stand'
};
const INTERNATIONAL = new Set(['Worlds', 'MSI', 'First Stand']);
const REGIONS = ['LCK', 'LPL', 'LEC', 'LCS'];
const POSITIONS = { Top: 'Top', Jungle: 'Jungle', Mid: 'Mid', Bot: 'Bot', 'AD Carry': 'Bot', Support: 'Support' };
// Same Worlds page patterns as build-player-db.js (a looser one also matches IEM and national-team events).
const worldsWhere = f => `(${f} LIKE '____ Season World Championship%' OR ${f} LIKE 'Season _ World Championship%')`;

const pageKey = link => link.charAt(0).toUpperCase() + link.slice(1);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const yearOf = r => r.Start?.slice(0, 4) || r.Page.match(/\d{4}/)?.[0] || '';
const span = ys => { const s = [...ys].sort(); return s[0] === s.at(-1) ? s[0] : `${s[0]}–${s.at(-1)}`; };
// "Nuclear (Ilias Bizriken)" → "nuclear"; "NUCLEAR INT" and "NuclearINT" are the same nick.
const nickKey = nick => nick.replace(/\s*\(.*\)\s*$/, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const looseTeam = t => t.toLowerCase().replace(/[^a-z0-9]/g, '');
// Results may name "SK Telecom T1" while the roster says "SK Telecom T1 K".
const sameTeam = (a, b) => { const x = looseTeam(a), y = looseTeam(b); return x.startsWith(y) || y.startsWith(x); };
const eventYear = page => page.match(/\d{4}/)?.[0] || page.match(/Season \d/)?.[0];

let base = null;
/** Rosters of every major-league and international tournament, resolved to players.json entries. */
async function loadBase() {
  if (base) return base;
  const players = JSON.parse(await readFile(path.join(ROOT, 'data', 'players.json'), 'utf8'));
  const teams = JSON.parse(await readFile(path.join(ROOT, 'data', 'teams.json'), 'utf8'));
  const byPage = new Map(players.map(p => [p.wikiPage.toLowerCase(), p]));
  const rows = await cargoQuery({
    tables: 'TournamentPlayers=TP,Tournaments=T',
    joinOn: 'TP.OverviewPage=T.OverviewPage',
    fields: 'TP.Link=Link,TP.Player=Player,TP.Team=Team,TP.Role=Role,TP.OverviewPage=Page,T.League=League,T.DateStart=Start',
    where: `T.League IN (${Object.keys(SHORT).map(cargoStr).join(',')}) AND T.TournamentLevel='Primary' AND TP.Link IS NOT NULL AND TP.Player IS NOT NULL`,
    orderBy: 'T.DateStart',
    fresh
  });
  console.log(`  ${rows.length} wierszy składów`);

  // Old roster links ("NuclearINT") resolve to the current page ("Nuc") through PlayerRedirects.
  const redirectTo = new Map();
  for (const batch of chunk([...new Set(rows.map(r => pageKey(r.Link)))].filter(l => !byPage.has(l.toLowerCase())), 100)) {
    (await cargoQuery({ tables: 'PlayerRedirects', fields: 'AllName,OverviewPage', where: `AllName IN (${batch.map(cargoStr).join(',')})`, fresh }))
      .forEach(r => redirectTo.set(r.AllName.toLowerCase(), r.OverviewPage));
  }
  const playerOf = link => link && (byPage.get(pageKey(link).toLowerCase())
    || byPage.get((redirectTo.get(pageKey(link).toLowerCase()) || '').toLowerCase()));

  /** player id → roster rows, with the league shortened and the role parsed */
  const rowsOf = new Map();
  for (const r of rows) {
    const p = playerOf(r.Link);
    if (!p) continue;
    const roles = (r.Role || '').split(',').map(s => s.trim());
    const row = { ...r, league: SHORT[r.League], year: yearOf(r), coach: roles.some(x => /coach/i.test(x)),
      positions: roles.map(x => POSITIONS[x]).filter(Boolean) };
    if (!rowsOf.has(p.id)) rowsOf.set(p.id, []);
    rowsOf.get(p.id).push(row);
  }
  const fame = new Map([...rowsOf].map(([id, rs]) =>
    [id, new Set(rs.filter(r => INTERNATIONAL.has(r.league) && !r.coach).map(r => `${r.league} ${r.year}`)).size]));
  base = { players, teams, byId: new Map(players.map(p => [p.id, p])), rowsOf, fame, playerOf };
  return base;
}

let winnersCache = null;
/** Event winners as rosters: [{ trophy, year, team, members: Set<player id> }] (players only, no coaches). */
async function winningRosters() {
  if (winnersCache) return winnersCache;
  const { rowsOf } = await loadBase();
  const events = [
    // Top-level event pages only (not "/Main Event"), like build-player-db.js.
    { trophy: 'Worlds', where: "(TR.OverviewPage LIKE '____ Season World Championship' OR TR.OverviewPage LIKE 'Season _ World Championship')" },
    { trophy: 'MSI', where: "TR.OverviewPage LIKE '% Mid-Season Invitational'" },
    { trophy: 'First Stand', where: "TR.OverviewPage LIKE '% First Stand'" }
  ];
  winnersCache = [];
  for (const ev of events) {
    const rows = await cargoQuery({ tables: 'TournamentResults=TR', fields: 'TR.OverviewPage=Page,TR.Team=Team',
      where: `${ev.where} AND TR.Place_Number=1 AND TR.Team IS NOT NULL AND TR.Team != ''`, fresh });
    for (const w of rows) {
      const members = new Set();
      for (const [id, rs] of rowsOf) {
        if (rs.some(r => !r.coach && (r.Page === w.Page || r.Page.startsWith(w.Page + '/')) && sameTeam(r.Team, w.Team))) members.add(id);
      }
      winnersCache.push({ trophy: ev.trophy, year: eventYear(w.Page), team: w.Team, members });
    }
  }
  return winnersCache;
}

// Title-deciding league events: playoffs pages minus qualifiers and preseason cups.
const NOT_A_TITLE = /Road to MSI|Play-In|Lock.?In|Promotion|Qualifier/i;
let titlesCache = null;
/** League titles as rosters: [{ league, title, year, team, members: Set<player id> }] (players only, no coaches). */
async function leagueTitles() {
  if (titlesCache) return titlesCache;
  const { rowsOf } = await loadBase();
  const rows = await cargoQuery({ tables: 'Tournaments=T,TournamentResults=TR', joinOn: 'T.OverviewPage=TR.OverviewPage',
    fields: 'T.OverviewPage=Page,T.League=League,T.IsPlayoffs=IsPlayoffs,T.DateStart=Start,TR.Team=Team',
    where: `T.League IN (${Object.keys(SHORT).filter(l => REGIONS.includes(SHORT[l])).map(cargoStr).join(',')})`
      + " AND T.TournamentLevel='Primary' AND TR.Place_Number=1 AND TR.Team IS NOT NULL AND TR.Team != ''",
    orderBy: 'T.DateStart', fresh });
  titlesCache = rows
    // OGN Champions had no separate playoffs page before 2015: the whole event decided the title.
    .filter(r => !NOT_A_TITLE.test(r.Page) && (r.IsPlayoffs === '1' || (r.League === 'LoL The Champions' && r.Start < '2015')))
    .map(r => {
      const members = new Set();
      for (const [id, rs] of rowsOf) {
        if (rs.some(x => !x.coach && (x.Page === r.Page || x.Page.startsWith(r.Page + '/')) && sameTeam(x.Team, r.Team))) members.add(id);
      }
      if (!members.size) console.warn(`  ⚠ ${r.Page} (${r.Team}): brak składu w Leaguepedii`);
      // "LCK/2016 Season/Summer Playoffs" → "LCK 2016 Summer", "LCK/2025 Season/Season Playoffs" → "LCK 2025"
      const title = r.Page.replace(/^Champions\//, 'OGN Champions/').replace(/ Season\//, ' ').replace(/\//g, ' ')
        .replace(/( Season)? Playoffs$| Season$/, '');
      return { league: SHORT[r.League], title, year: yearOf(r), team: r.Team, members };
    });
  return titlesCache;
}

/** Candidates for one trophy: everyone on a winning roster, their wins oldest first. */
function winnersCard(wins, byId) {
  return [...new Set(wins.flatMap(w => [...w.members]))].map(id => card(byId.get(id),
    wins.filter(w => w.members.has(id)).sort((a, b) => a.year.localeCompare(b.year)).map(w => ({ title: w.title, sub: w.team }))));
}

const leagueChampion = league => ({ title: `Mistrz ${league}`, async build() {
  const { byId } = await loadBase();
  return winnersCard((await leagueTitles()).filter(t => t.league === league), byId);
} });

const trophyWinner = trophy => ({ title: `Wygrał ${trophy}`, async build() {
  const { byId } = await loadBase();
  return winnersCard((await winningRosters()).filter(w => w.trophy === trophy).map(w => ({ ...w, title: `${trophy} ${w.year}` })), byId);
} });

let finalsCache = null;
/** Worlds finals: [{ year, winner, loser, mvp, win, lose, hasLineup }] from MatchSchedule + ScoreboardPlayers. */
async function worldsFinals() {
  if (finalsCache) return finalsCache;
  const { playerOf } = await loadBase();
  const ms = (await cargoQuery({ tables: 'MatchSchedule', fields: 'OverviewPage,Team1,Team2,Winner,MVP,MatchId',
    where: `${worldsWhere('OverviewPage')} AND OverviewPage NOT LIKE '%Qualifier%' AND (Tab='Finals' OR Round='Finals')`, fresh }))
    .filter(m => m.Winner === '1' || m.Winner === '2');
  const lineups = await cargoQuery({ tables: 'ScoreboardPlayers', fields: 'MatchId,Link,Team',
    where: `MatchId IN (${ms.map(m => cargoStr(m.MatchId)).join(',')})`, groupBy: 'MatchId,Link,Team', fresh });
  finalsCache = ms.map(m => {
    const winner = m.Winner === '1' ? m.Team1 : m.Team2, loser = m.Winner === '1' ? m.Team2 : m.Team1;
    const side = team => new Set(lineups.filter(l => l.MatchId === m.MatchId && l.Team === team).map(l => playerOf(l.Link)?.id).filter(Boolean));
    return { year: eventYear(m.OverviewPage), winner, loser, mvp: m.MVP, win: side(winner), lose: side(loser),
      hasLineup: lineups.some(l => l.MatchId === m.MatchId) };
  });
  return finalsCache;
}

/** One candidate: `lines` are the facts the reviewer reads, oldest first. */
const card = (p, lines, extra = {}) => ({ id: p.id, nick: p.nick, fame: base.fame.get(p.id) || 0, career: p.tournaments, lines, ...extra });

/** Groups a player's rows by `keyOf`, keeping groups with at least `min` tournaments, oldest first. */
function groups(rs, keyOf, min) {
  const g = new Map();
  for (const r of rs) {
    const k = keyOf(r);
    if (k == null) continue;
    if (!g.has(k)) g.set(k, { rows: [], events: new Set(), years: [], teams: new Set(), leagues: new Set() });
    const u = g.get(k);
    u.rows.push(r); u.events.add(r.Page); u.years.push(r.year); u.teams.add(r.Team); u.leagues.add(r.league);
  }
  return [...g.entries()].filter(([, u]) => u.events.size >= min).sort((a, b) => span(a[1].years).localeCompare(span(b[1].years)));
}

const CATEGORIES = {
  'nick-change': { title: 'Zmienił nick w trakcie kariery', async build() {
    const { byId, rowsOf } = await loadBase();
    const out = [];
    for (const [id, rs] of rowsOf) {
      const p = byId.get(id);
      const realName = nickKey(p.name || '');
      const used = groups(rs.filter(r => !r.coach), r => (nickKey(r.Player) === realName ? null : nickKey(r.Player)), MIN);
      if (used.length < 2) continue;
      const keys = used.map(([k]) => k);
      out.push(card(p, used.map(([, u]) => ({
        title: [...new Set(u.rows.map(r => r.Player.replace(/\s*\(.*\)\s*$/, '')))].join(' / '),
        sub: `${span(u.years)} · ${[...u.leagues].join('/')} · ${u.events.size} turn.` })),
      { extended: keys.some(a => keys.some(b => a !== b && b.startsWith(a))) }));
    }
    return out;
  } },

  'role-swap': { title: 'Zmienił rolę w trakcie kariery', async build() {
    const { byId, rowsOf } = await loadBase();
    const out = [];
    for (const [id, rs] of rowsOf) {
      const used = groups(rs.filter(r => !r.coach && r.positions.length === 1), r => r.positions[0], MIN);
      if (used.length < 2) continue;
      out.push(card(byId.get(id), used.map(([role, u]) => ({ title: role,
        sub: `${span(u.years)} · ${[...u.teams].slice(0, 3).join(', ')} · ${u.events.size} turn.` }))));
    }
    return out;
  } },

  'three-regions': { title: 'Grał w co najmniej 3 głównych regionach', async build() {
    const { byId, rowsOf } = await loadBase();
    const out = [];
    for (const [id, rs] of rowsOf) {
      const used = groups(rs.filter(r => !r.coach && REGIONS.includes(r.league)), r => r.league, 1);
      if (used.length < 3) continue;
      out.push(card(byId.get(id), used.map(([lg, u]) => ({ title: lg, sub: `${span(u.years)} · ${[...u.teams].join(', ')}` }))));
    }
    return out;
  } },

  'one-club': { title: 'Całą tier 1 karierę w jednym klubie', async build() {
    const { byId, rowsOf, teams } = await loadBase();
    // Roster name → organization, so SK Telecom T1 and T1 are one club. Names missing from teams.json stay as they are.
    const orgOf = new Map(teams.flatMap(t => [t.page, t.name, ...t.aliases].map(n => [looseTeam(n), t.name])));
    const out = [];
    for (const [id, rs] of rowsOf) {
      const played = rs.filter(r => !r.coach && r.positions.length);
      if (new Set(played.map(r => r.Page)).size < MIN) continue;
      const orgs = new Set(played.map(r => orgOf.get(looseTeam(r.Team)) || r.Team));
      if (orgs.size !== 1) continue;
      out.push(card(byId.get(id), [{ title: [...orgs][0],
        sub: `${span(played.map(r => r.year))} · ${new Set(played.map(r => r.Page)).size} turn. · ${[...new Set(played.map(r => r.Team))].join(' / ')}` }]));
    }
    return out;
  } },

  'player-to-coach': { title: 'Gracz, który został trenerem', async build() {
    const { byId, rowsOf } = await loadBase();
    const out = [];
    for (const [id, rs] of rowsOf) {
      const played = rs.filter(r => !r.coach && r.positions.length);
      const coached = rs.filter(r => r.coach && [...REGIONS, 'LTA'].includes(r.league));
      if (!played.length || !coached.length) continue;
      // Coached first and played later (player-coaches, emergency subs) is not this category.
      if (span(coached.map(r => r.year)).slice(0, 4) < span(played.map(r => r.year)).slice(-4)) continue;
      out.push(card(byId.get(id), [
        { title: 'Gracz', sub: `${span(played.map(r => r.year))} · ${[...new Set(played.map(r => r.Team))].slice(-3).join(', ')}` },
        { title: 'Trener', sub: `${span(coached.map(r => r.year))} · ${[...new Set(coached.map(r => r.Team))].slice(-3).join(', ')}` }
      ]));
    }
    return out;
  } },

  'msi-multi': { title: 'Wygrał MSI więcej niż raz', async build() {
    const { byId } = await loadBase();
    const wins = (await winningRosters()).filter(w => w.trophy === 'MSI');
    return [...new Set(wins.flatMap(w => [...w.members]))].map(id => {
      const mine = wins.filter(w => w.members.has(id)).sort((a, b) => a.year.localeCompare(b.year));
      return mine.length >= 2 ? card(byId.get(id), mine.map(w => ({ title: `MSI ${w.year}`, sub: w.team }))) : null;
    }).filter(Boolean);
  } },

  'msi-winner': trophyWinner('MSI'),
  'first-stand-winner': trophyWinner('First Stand'),
  'lck-champion': leagueChampion('LCK'),
  'lpl-champion': leagueChampion('LPL'),
  'lec-champion': leagueChampion('LEC'),
  'lcs-champion': leagueChampion('LCS'),

  'worlds-winner': { title: 'Mistrz świata', async build() {
    const { byId } = await loadBase();
    const wins = (await winningRosters()).filter(w => w.trophy === 'Worlds');
    return [...new Set(wins.flatMap(w => [...w.members]))].map(id => card(byId.get(id),
      wins.filter(w => w.members.has(id)).sort((a, b) => a.year.localeCompare(b.year)).map(w => ({ title: `Worlds ${w.year}`, sub: w.team }))));
  } },

  'worlds-and-msi': { title: 'Wygrał i Worlds, i MSI', async build() {
    const { byId } = await loadBase();
    const wins = (await winningRosters()).filter(w => w.trophy !== 'First Stand');
    return [...new Set(wins.flatMap(w => [...w.members]))].map(id => {
      const mine = wins.filter(w => w.members.has(id)).sort((a, b) => a.year.localeCompare(b.year));
      if (!mine.some(w => w.trophy === 'Worlds') || !mine.some(w => w.trophy === 'MSI')) return null;
      return card(byId.get(id), mine.map(w => ({ title: `${w.trophy} ${w.year}`, sub: w.team })));
    }).filter(Boolean);
  } },

  'worlds-final-both': { title: 'Grał w finale Worlds po obu stronach: raz wygrał, raz przegrał', async build() {
    const { byId } = await loadBase();
    const finals = await worldsFinals();
    return [...byId.keys()].map(id => {
      const lines = finals.filter(f => f.win.has(id) || f.lose.has(id)).sort((a, b) => a.year.localeCompare(b.year))
        .map(f => (f.win.has(id) ? { title: `Wygrał ${f.year}`, sub: `${f.winner} vs ${f.loser}` } : { title: `Przegrał ${f.year}`, sub: `${f.loser} vs ${f.winner}` }));
      return lines.some(l => l.title.startsWith('W')) && lines.some(l => l.title.startsWith('P')) ? card(byId.get(id), lines) : null;
    }).filter(Boolean);
  } },

  'worlds-no-final': { title: 'Wygrał Worlds, ale nie zagrał w finale', async build() {
    const { byId } = await loadBase();
    const finals = await worldsFinals();
    const out = new Map();
    for (const w of (await winningRosters()).filter(w => w.trophy === 'Worlds')) {
      const f = finals.find(x => x.year === w.year);
      if (!f?.hasLineup) { console.warn(`  ⚠ Worlds ${w.year}: brak składu z finału w Leaguepedii, pomijam`); continue; }
      for (const id of w.members) {
        if (f.win.has(id)) continue;
        if (!out.has(id)) out.set(id, card(byId.get(id), []));
        out.get(id).lines.push({ title: `Worlds ${w.year}`, sub: `${w.team}: w składzie, bez gry w finale` });
      }
    }
    return [...out.values()];
  } },

  'finals-mvp': { title: 'Finals MVP na Worlds', async build() {
    const { byId, playerOf } = await loadBase();
    const finals = await worldsFinals();
    const missing = finals.filter(f => !f.mvp).map(f => f.year);
    if (missing.length) console.warn(`  ⚠ brak MVP w Leaguepedii dla: ${missing.join(', ')}; uzupełnij ręcznie`);
    const out = new Map();
    for (const f of finals.filter(f => f.mvp)) {
      const p = playerOf(f.mvp);
      if (!p) { console.warn(`  ⚠ MVP ${f.year} „${f.mvp}” nie ma w bazie graczy`); continue; }
      if (!out.has(p.id)) out.set(p.id, card(p, []));
      out.get(p.id).lines.push({ title: `Finals MVP ${f.year}`, sub: `${f.winner} vs ${f.loser}` });
    }
    return [...out.values()];
  } },

  team: { title: '', async build() {
    const { byId, rowsOf, teams } = await loadBase();
    const team = teams.find(t => t.id === (opt('team') || 'gen-g'));
    if (!team) throw new Error(`Nie ma drużyny --team=${opt('team')} w data/teams.json`);
    this.title = `Grał w ${team.name}`;
    this.key = `team-${team.id}`;
    const names = new Set([team.page, team.name, ...team.aliases].map(looseTeam));
    const out = [];
    for (const [id, rs] of rowsOf) {
      const mine = rs.filter(r => !r.coach && names.has(looseTeam(r.Team)));
      if (mine.length) out.push(card(byId.get(id), [{ title: [...new Set(mine.map(r => r.Team))].join(' / '),
        sub: `${span(mine.map(r => r.year))} · ${new Set(mine.map(r => r.Page)).size} turn.` }]));
    }
    return out;
  } }
};

const wanted = process.argv[2] === 'all' ? Object.keys(CATEGORIES) : [process.argv[2]];
if (!wanted.every(n => CATEGORIES[n])) {
  console.error(`Użycie: npm run connections-candidates -- <${Object.keys(CATEGORIES).join('|')}|all> [--min=2] [--fame=2] [--team=gen-g] [--fresh]`);
  process.exit(1);
}
await login();
await mkdir(OUT_DIR, { recursive: true });
for (const name of wanted) {
  const cat = CATEGORIES[name];
  console.log(`\n▶ ${name}`);
  const all = await cat.build();
  const list = all.filter(c => c.fame >= FAME).sort((a, b) => b.fame - a.fame || b.career - a.career);
  const key = cat.key || name;
  const file = path.join(OUT_DIR, `${key}.json`);
  await writeFile(file, JSON.stringify({ category: key, title: cat.title, fame: FAME, candidates: list }, null, 2));
  list.forEach((c, i) => console.log(`${String(i + 1).padStart(3)}. ${c.extended ? '(~) ' : ''}${c.nick} [${c.fame}]: ${c.lines.map(l => `${l.title} (${l.sub})`).join(' → ')}`));
  console.log(`  ${list.length} kandydatów (z ${all.length}; odcięci z rozpoznawalnością < ${FAME}) → ${path.relative(ROOT, file)}`);
}
