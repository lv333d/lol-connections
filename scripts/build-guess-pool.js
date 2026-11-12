// Builds data/guess-players.json for "Guess the Pro" from data/players.json plus a few Leaguepedia queries.
// Usage: npm run build-guess [-- --fresh]     (run after build-players; --fresh ignores the response cache)
//
// Pool: players (never coaches) who played at MIN_INTL+ international events (Worlds, MSI, First Stand) for a team from
// one of the five major leagues (LCK, LPL, LEC, LCS, LTA) — a team counts as major for an event when it played in
// a major league that same year, so minor-region teams (PCS, VCS, CBLOL before 2025, LCP…) don't make the pool.
// Per player:
//   nat      nationality (ISO code, from players.json)
//   team     current team { name, short, logo } — the team of their latest roster in the last CURRENT_MONTHS
//            (any league, ERLs included; international events, showmatches and qualifiers skipped), null when
//            retired or without a roster
//   league   that roster's league ("LCK", "LFL"…), null as above
//   titles   international titles won as a player (each Worlds / MSI / First Stand counted)
//   debut    first year on a major-league roster as a player
//   with     pool players they shared a roster with as players (players.json teammates minus via-coaching)
//   intl     international events played (for the daily pick and the search order)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, slugify } from './lib/puzzles.js';
import { cargoQuery, cargoStr } from './lib/leaguepedia.js';

const DATA_DIR = path.join(ROOT, 'data');
const fresh = process.argv.includes('--fresh');
const CURRENT_MONTHS = 12;

// Same league names as build-player-db.js.
const MAJOR = {
  LCK: ['LoL Champions Korea', 'LoL The Champions'],
  LPL: ['Tencent LoL Pro League'],
  LEC: ['LoL EMEA Championship', 'Europe League Championship Series'],
  LCS: ['League of Legends Championship Series', 'North America League Championship Series', 'League of Legends Championship of The Americas North'],
  LTA: ['League of Legends Championship of The Americas', 'League of Legends Championship of The Americas South']
};
const INTERNATIONAL = ['World Championship', 'Mid-Season Invitational', 'First Stand'];
const TITLE_EVENTS = [
  "(TR.OverviewPage LIKE '____ Season World Championship' OR TR.OverviewPage LIKE 'Season _ World Championship')",
  "TR.OverviewPage LIKE '% Mid-Season Invitational'",
  "TR.OverviewPage LIKE '% First Stand'"
];
// Official but not a team's own league: international events and the European cross-league tournaments.
const NOT_DOMESTIC = [...INTERNATIONAL, 'European Masters', 'EMEA Masters'];
const event = r => r.Page.split('/')[0];
const INTL_EVENT = /(Season World Championship|Season \d World Championship|Mid-Season Invitational|First Stand)$/;
// Guessable and drawn players alike: at least this many international events (known players only).
const MIN_INTL = 2;
const MAJOR_OF = new Map(Object.entries(MAJOR).flatMap(([id, names]) => names.map(n => [n, id])));
const isCoachRole = role => /coach/i.test(role || '');
const isStaff = role => !role || /analyst|manager|owner|staff/i.test(role);
const asPlayer = r => !isCoachRole(r.Role) && !isStaff(r.Role);
const pageKey = link => link.charAt(0).toUpperCase() + link.slice(1);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const step = msg => console.log(`\n▶ ${msg}`);

const db = JSON.parse(await readFile(path.join(DATA_DIR, 'players.json'), 'utf8'));
const teams = JSON.parse(await readFile(path.join(DATA_DIR, 'teams.json'), 'utf8'));
const overrides = JSON.parse(await readFile(path.join(DATA_DIR, 'team-overrides.json'), 'utf8'));

// Leaguepedia team name → organization (teams.json lists every former name as an alias).
const orgByName = new Map();
for (const t of teams) [t.page, t.name, ...t.aliases].forEach(n => orgByName.set(n.toLowerCase(), t));
for (const [org, names] of Object.entries(overrides.merge || {})) {
  const t = orgByName.get(org.toLowerCase());
  if (t) names.forEach(n => orgByName.set(n.toLowerCase(), t));
}
const orgOf = name => orgByName.get((name || '').toLowerCase());
const orgKey = name => orgOf(name)?.id || slugify(name);

// Roster link → player (players.json keeps canonical wiki pages; links can be redirects).
const byPage = new Map(db.map(p => [p.wikiPage.toLowerCase(), p]));
const redirects = new Map();
async function resolveLinks(links) {
  const unknown = [...new Set(links.map(pageKey))].filter(l => !byPage.has(l.toLowerCase()) && !redirects.has(l.toLowerCase()));
  for (const batch of chunk(unknown, 150)) {
    (await cargoQuery({ tables: 'PlayerRedirects', fields: 'AllName,OverviewPage', where: `AllName IN (${batch.map(cargoStr).join(',')})`, fresh }))
      .forEach(r => redirects.set(r.AllName.toLowerCase(), r.OverviewPage.toLowerCase()));
    batch.forEach(l => { if (!redirects.has(l.toLowerCase())) redirects.set(l.toLowerCase(), null); });
  }
}
const playerOf = link => {
  const k = pageKey(link).toLowerCase();
  return byPage.get(k) || byPage.get(redirects.get(k) || '');
};

step('Składy: ligi główne i turnieje międzynarodowe (z rokiem)');
const rows = await cargoQuery({
  tables: 'TournamentPlayers=TP,Tournaments=T',
  joinOn: 'TP.OverviewPage=T.OverviewPage',
  fields: 'TP.Team=Team,TP.Link=Link,TP.Role=Role,TP.OverviewPage=Page,T.League=League,T.Year=Year',
  where: `T.League IN (${[...MAJOR_OF.keys(), ...INTERNATIONAL].map(cargoStr).join(',')}) AND T.TournamentLevel='Primary'`
    + ' AND TP.Link IS NOT NULL AND TP.Team IS NOT NULL',
  orderBy: 'TP.OverviewPage,TP.Team',
  fresh
});
console.log(`  ${rows.length} wierszy`);
await resolveLinks(rows.map(r => r.Link));

// Organization × year in a major league → that year's international rosters of the organization are major.
const majorYears = new Set(rows.filter(r => MAJOR_OF.has(r.League)).map(r => `${orgKey(r.Team)}|${r.Year}`));
const info = new Map(); // player id → { debut, intl: Set<page>, pages: Map<page, team> }
const get = p => info.get(p.id) || info.set(p.id, { debut: 0, intl: new Set(), rosters: [] }).get(p.id);
for (const r of rows) {
  if (!asPlayer(r)) continue;
  const p = playerOf(r.Link);
  if (!p) continue;
  const i = get(p);
  i.rosters.push(r);
  if (MAJOR_OF.has(r.League)) i.debut = i.debut ? Math.min(i.debut, +r.Year) : +r.Year;
  // Only the events themselves: Leaguepedia files regional qualifiers ("NA LCS/2015 Season/Regional Finals") under
  // the World Championship league too.
  else if (INTL_EVENT.test(event(r)) && majorYears.has(`${orgKey(r.Team)}|${r.Year}`)) i.intl.add(event(r));
}
const pool = db.filter(p => !p.coachOnly && info.get(p.id)?.intl.size >= MIN_INTL && info.get(p.id).debut);
const inPool = new Set(pool.map(p => p.id));
console.log(`  pula: ${pool.length} graczy`);

step('Tytuły międzynarodowe');
const winners = [];
for (const where of TITLE_EVENTS) {
  (await cargoQuery({ tables: 'TournamentResults=TR', fields: 'TR.OverviewPage=Page,TR.Team=Team', where: `${where} AND TR.Place_Number=1 AND TR.Team IS NOT NULL AND TR.Team != ''`, fresh }))
    .forEach(r => winners.push(r));
}
const titles = new Map();
for (const p of pool) {
  const won = new Set();
  for (const r of info.get(p.id).rosters) {
    const w = winners.find(w => (r.Page === w.Page || r.Page.startsWith(w.Page + '/')) && orgKey(r.Team) === orgKey(w.Team));
    if (w) won.add(w.Page);
  }
  titles.set(p.id, won.size);
}
console.log(`  zwycięzców: ${winners.length}; graczy z tytułem: ${[...titles.values()].filter(Boolean).length}`);

step(`Obecna drużyna (ostatni skład z ${CURRENT_MONTHS} mies.)`);
const since = new Date();
since.setUTCMonth(since.getUTCMonth() - CURRENT_MONTHS);
const sinceStr = since.toISOString().slice(0, 10);
const links = [...new Set(pool.flatMap(p => info.get(p.id).rosters.map(r => r.Link)))];
const latest = new Map(); // player id → row
for (const batch of chunk(links, 100)) {
  const recent = await cargoQuery({
    tables: 'TournamentPlayers=TP,Tournaments=T,Leagues=L',
    joinOn: 'TP.OverviewPage=T.OverviewPage,T.League=L.League',
    fields: 'TP.Team=Team,TP.Link=Link,TP.Role=Role,T.League=League,L.League_Short=Short,T.DateStart=Start,T.TournamentLevel=Level',
    where: `TP.Link IN (${batch.map(cargoStr).join(',')}) AND T.DateStart >= '${sinceStr}'`
      // Official domestic leagues only: no showmatches, streamer cups, EWC, Demacia Cup or cross-league events.
      + ` AND L.IsOfficial='Yes' AND L.Region != 'International' AND T.League NOT IN (${NOT_DOMESTIC.map(cargoStr).join(',')})`
      + ' AND TP.Team IS NOT NULL',
    fresh
  });
  for (const r of recent) {
    if (!asPlayer(r) || /showmatch|qualifier/i.test(r.Level || '')) continue;
    const p = playerOf(r.Link);
    if (!p || !inPool.has(p.id)) continue;
    const cur = latest.get(p.id);
    if (!cur || r.Start > cur.Start || (r.Start === cur.Start && MAJOR_OF.has(r.League))) latest.set(p.id, r);
  }
}
const leagueLabel = r => MAJOR_OF.get(r.League) || r.Short || r.League;
console.log(`  z obecną drużyną: ${[...latest.keys()].filter(id => !db.find(p => p.id === id).retired).length}`);
console.log(`  ligi: ${Object.entries(Object.groupBy([...latest.values()], leagueLabel)).map(([l, v]) => `${l} ${v.length}`).sort().join(', ')}`);

const out = pool.map(p => {
  const i = info.get(p.id);
  const r = !p.retired && latest.get(p.id);
  const org = r && orgOf(r.Team);
  const coached = new Set(p.viaCoaching?.teammates || []);
  return {
    id: p.id, nick: p.nick, name: p.name, nat: p.nationality,
    team: r ? { id: org?.id || slugify(r.Team), name: org?.name || r.Team, short: org?.short || r.Team } : null,
    league: r ? leagueLabel(r) : null,
    titles: titles.get(p.id), debut: i.debut, intl: i.intl.size,
    with: p.teammates.filter(t => !coached.has(t) && inPool.has(t))
  };
}).sort((a, b) => b.intl - a.intl || a.nick.localeCompare(b.nick));

await writeFile(path.join(DATA_DIR, 'guess-players.json'), JSON.stringify(out) + '\n');
step('Podsumowanie');
console.log(`  data/guess-players.json: ${out.length} graczy`);
console.log(`  przykłady: ${out.slice(0, 6).map(p => `${p.nick} (${p.nat}, ${p.league || '—'} ${p.team?.short || '—'}, ${p.titles}🏆, ${p.debut})`).join('; ')}`);
