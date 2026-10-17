// Builds the LoL Grid player database from Leaguepedia Cargo tables.
// Usage: npm run build-players [-- --fresh]     (--fresh ignores the .cache/leaguepedia response cache)
// Output:
//   data/players.json        full database for scripts (teams, leagues, trophies, teammates)
//   data/players-index.json  slim { id, nick, name } list for the browser search
//   data/teams.json          organizations with merged renames and logo file names
// Which team names form one organization is decided by Leaguepedia renames plus data/team-overrides.json.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, slugify } from './lib/puzzles.js';
import { cargoQuery, cargoStr, login } from './lib/leaguepedia.js';

const DATA_DIR = path.join(ROOT, 'data');
const fresh = process.argv.includes('--fresh');

// Leaguepedia "League" names → our league ids (historical names included).
const LEAGUES = {
  LCK: ['LoL Champions Korea', 'LoL The Champions'],
  LPL: ['Tencent LoL Pro League'],
  LEC: ['LoL EMEA Championship', 'Europe League Championship Series'],
  // LTA North (2025) is the LCS under another name.
  LCS: ['League of Legends Championship Series', 'North America League Championship Series', 'League of Legends Championship of The Americas North'],
  LTA: ['League of Legends Championship of The Americas', 'League of Legends Championship of The Americas South']
};
// Cross-conference LTA events (e.g. Split playoffs) mix North and South teams: North teams count as LCS there too.
const LTA_COMBINED = 'League of Legends Championship of The Americas';
const LTA_NORTH = 'League of Legends Championship of The Americas North';
const INTERNATIONAL = ['World Championship', 'Mid-Season Invitational', 'First Stand'];
const LEAGUE_OF = new Map(Object.entries(LEAGUES).flatMap(([id, names]) => names.map(n => [n, id])));

// Winners are read from TournamentResults of the top-level event page.
const TROPHY_EVENTS = [
  // Riot's Worlds only: "2014 Season World Championship" and the older "Season 3 World Championship"
  // (a looser pattern also matches IEM and national-team "World Championship" events).
  { trophy: 'worlds', where: "(TR.OverviewPage LIKE '____ Season World Championship' OR TR.OverviewPage LIKE 'Season _ World Championship')" },
  { trophy: 'msi', where: "TR.OverviewPage LIKE '% Mid-Season Invitational'" },
  { trophy: 'first-stand', where: "TR.OverviewPage LIKE '% First Stand'" }
];

const isCoachRole = role => /coach/i.test(role || '');
// "Retired" in the grid means retired as a player: fully retired on Leaguepedia, or now in a non-playing
// role (coach, analyst, caster…) — Leaguepedia's IsRetired stays 0 for players who became coaches.
const isRetiredPlayer = prof => prof?.IsRetired === '1'
  || Boolean(prof?.Role && !/^(top|jungle|mid|bot|ad carry|support)$/i.test(prof.Role.trim()));
const nickFromPage = page => page.replace(/\s*\(.*\)\s*$/, '');
// MediaWiki titles always start upper-case ("kkOma" is stored as page "KkOma").
const pageKey = link => link.charAt(0).toUpperCase() + link.slice(1);
const ENTITIES = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', '#39': "'" };
const decodeEntities = s => (s || '').replace(/&(nbsp|amp|quot|apos|lt|gt|#39);/g, (_, e) => ENTITIES[e]).replace(/\s+/g, ' ').trim();

async function loadTeamOverrides() {
  const raw = JSON.parse(await readFile(path.join(DATA_DIR, 'team-overrides.json'), 'utf8'));
  const mergeInto = new Map();
  for (const [org, names] of Object.entries(raw.merge || {})) names.forEach(n => mergeInto.set(n, org));
  return { mergeInto, split: new Set(raw.split || []), raw };
}
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const step = msg => console.log(`\n▶ ${msg}`);

async function main() {
  const user = await login();
  console.log(user ? `Zalogowano jako ${user}` : 'Tryb anonimowy');

  step('Składy turniejowe (TournamentPlayers × Tournaments)');
  const leagueNames = [...LEAGUE_OF.keys(), ...INTERNATIONAL];
  const rosterRows = await cargoQuery({
    tables: 'TournamentPlayers=TP,Tournaments=T',
    joinOn: 'TP.OverviewPage=T.OverviewPage',
    fields: 'TP.Team=Team,TP.Link=Link,TP.Role=Role,TP.OverviewPage=Page,T.League=League',
    where: `T.League IN (${leagueNames.map(cargoStr).join(',')}) AND T.TournamentLevel='Primary' AND TP.Link IS NOT NULL AND TP.Team IS NOT NULL`,
    orderBy: 'TP.OverviewPage,TP.Team',
    fresh
  });
  console.log(`  ${rosterRows.length} wierszy`);

  step('Zwycięzcy Worlds / MSI / First Stand');
  const winners = []; // { trophy, page, team }
  for (const ev of TROPHY_EVENTS) {
    const rows = await cargoQuery({
      tables: 'TournamentResults=TR',
      fields: 'TR.OverviewPage=Page,TR.Team=Team',
      where: `${ev.where} AND TR.Place_Number=1 AND TR.Team IS NOT NULL AND TR.Team != ''`,
      fresh
    });
    rows.forEach(r => winners.push({ trophy: ev.trophy, page: r.Page, team: r.Team }));
    console.log(`  ${ev.trophy}: ${rows.map(r => `${r.Page.match(/\d{4}|Season \d/)?.[0]} ${r.Team}`).join(', ')}`);
  }

  step('Drużyny i zmiany nazw (Teams)');
  const teamNames = [...new Set(rosterRows.map(r => r.Team))];
  const teamRows = [];
  for (const names of chunk(teamNames, 100)) {
    teamRows.push(...await cargoQuery({
      tables: 'Teams',
      fields: 'Name,Short,Image,RenamedTo',
      where: `Name IN (${names.map(cargoStr).join(',')})`,
      fresh
    }));
  }
  const teamInfo = new Map(teamRows.map(t => [t.Name, t]));
  const overrides = await loadTeamOverrides();
  // Rename targets and override organizations may be outside the roster data — fetch them too (for logos).
  const missingTargets = [...new Set([...teamRows.map(t => t.RenamedTo), ...Object.keys(overrides.raw.merge || {})]
    .filter(n => n && !teamInfo.has(n)))];
  for (const names of chunk(missingTargets, 100)) {
    (await cargoQuery({ tables: 'Teams', fields: 'Name,Short,Image,RenamedTo', where: `Name IN (${names.map(cargoStr).join(',')})`, fresh }))
      .forEach(t => teamInfo.set(t.Name, t));
  }
  /** Team name → organization: override merges win, otherwise follow Leaguepedia renames unless split. */
  const franchiseOf = name => {
    const seen = new Set();
    while (!seen.has(name)) {
      seen.add(name);
      if (overrides.mergeInto.has(name)) return overrides.mergeInto.get(name);
      const next = teamInfo.get(name)?.RenamedTo;
      if (!next || overrides.split.has(name)) return name;
      name = next;
    }
    return name;
  };
  const northTeams = new Set(rosterRows.filter(r => r.League === LTA_NORTH).map(r => franchiseOf(r.Team)));
  const leagueOf = r => (r.League === LTA_COMBINED && northTeams.has(franchiseOf(r.Team)) ? 'LCS' : LEAGUE_OF.get(r.League));
  const known = new Set([...teamInfo.keys(), ...teamNames]);
  const unknown = [...overrides.mergeInto.keys(), ...overrides.split].filter(n => !known.has(n));
  if (unknown.length) console.warn(`  ⚠ team-overrides.json: brak w danych (literówka albo drużyna bez meczów w ligach): ${unknown.join(', ')}`);

  step('Profile graczy (Players)');
  const links = [...new Set(rosterRows.map(r => r.Link))];
  const byPage = new Map(); // canonical OverviewPage → profile
  const profileQuery = (where, i, n) => {
    process.stdout.write(`  partia ${i + 1}/${n}\r`);
    return cargoQuery({ tables: 'Players', fields: 'ID,OverviewPage,Name,IsRetired,Role', where, fresh });
  };
  const keys = [...new Set(links.map(pageKey))];
  for (const [i, batch] of chunk(keys, 150).entries()) {
    (await profileQuery(`OverviewPage IN (${batch.map(cargoStr).join(',')})`, i, Math.ceil(keys.length / 150)))
      .forEach(p => byPage.set(p.OverviewPage, p));
  }
  // Links that are redirects (renamed players, alternate spellings) resolve through PlayerRedirects.
  const unresolved = keys.filter(k => !byPage.has(k));
  const redirectTo = new Map();
  for (const batch of chunk(unresolved, 150)) {
    (await cargoQuery({ tables: 'PlayerRedirects', fields: 'AllName,OverviewPage', where: `AllName IN (${batch.map(cargoStr).join(',')})`, fresh }))
      .forEach(r => redirectTo.set(pageKey(r.AllName), r.OverviewPage));
  }
  const targets = [...new Set(redirectTo.values())].filter(p => !byPage.has(p));
  for (const [i, batch] of chunk(targets, 150).entries()) {
    (await profileQuery(`OverviewPage IN (${batch.map(cargoStr).join(',')})`, i, Math.ceil(targets.length / 150)))
      .forEach(p => byPage.set(p.OverviewPage, p));
  }
  /** Roster link → its profile (direct page, or via redirect). */
  const profiles = new Map();
  for (const link of links) {
    const k = pageKey(link);
    const prof = byPage.get(k) || byPage.get(redirectTo.get(k));
    if (prof) profiles.set(link, prof);
  }
  console.log(`  ${profiles.size}/${links.length} profili`);

  step('Składanie bazy');
  const players = new Map(); // wikiPage → Player
  const teamUsage = new Map(); // franchise → number of player-tournaments
  const rosters = new Map(); // "page|team" → Set<wikiPage> (players only — used for trophies)
  const squads = new Map(); // "page|team" → Set<wikiPage> (players and coaches — used for teammates)
  const coachedPages = new Set();
  const addTo = (map, key, link) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(link); };

  // One person may appear under several links (old nick, redirect) — key everything by the canonical page.
  const canonical = link => profiles.get(link)?.OverviewPage || pageKey(link);
  for (const row of rosterRows) {
    const r = { ...row, Link: canonical(row.Link) };
    const key = r.Page + '|' + r.Team;
    // A coach on someone's roster counts as having been on the same team (e.g. "Odoamne × coach" accepts
    // the coaches who coached Odoamne), but coaching never adds team, league or trophy credit.
    if (isCoachRole(r.Role)) { coachedPages.add(r.Link); addTo(squads, key, r.Link); continue; }
    if (!r.Role || /analyst|manager|owner|staff/i.test(r.Role)) continue;
    let p = players.get(r.Link);
    if (!p) {
      const prof = profiles.get(row.Link);
      p = {
        id: slugify(r.Link), nick: decodeEntities(prof?.ID) || nickFromPage(r.Link), name: decodeEntities(prof?.Name), wikiPage: r.Link,
        retired: isRetiredPlayer(prof), coach: isCoachRole(prof?.Role),
        teams: new Set(), leagues: new Set(), trophies: new Set(), teammates: new Set(), pages: new Set()
      };
      players.set(r.Link, p);
    }
    const franchise = franchiseOf(r.Team);
    p.teams.add(franchise);
    if (leagueOf(r)) p.leagues.add(leagueOf(r));
    p.pages.add(r.Page);
    teamUsage.set(franchise, (teamUsage.get(franchise) || 0) + 1);
    addTo(rosters, key, r.Link);
    addTo(squads, key, r.Link);
  }
  coachedPages.forEach(link => { if (players.has(link)) players.get(link).coach = true; });

  // Only people who also played can be grid answers, so pairs are kept when both sides are players.
  for (const members of squads.values()) {
    for (const a of members) {
      if (!players.has(a)) continue;
      for (const b of members) if (a !== b && players.has(b)) players.get(a).teammates.add(b);
    }
  }

  // A winning roster is the team's roster on the event page or any of its sub-pages (Main Event, Play-In…).
  for (const w of winners) {
    for (const [key, members] of rosters) {
      const [page, team] = key.split('|');
      // Compare organizations: results may name "SK Telecom T1" while the roster says "SK Telecom T1 K".
      if (franchiseOf(team) === franchiseOf(w.team) && (page === w.page || page.startsWith(w.page + '/'))) {
        members.forEach(link => players.get(link).trophies.add(w.trophy));
      }
    }
  }

  // Only keep players from the five major leagues (international-only players are noise for the grid).
  const kept = [...players.values()].filter(p => p.leagues.size > 0);
  const keptPages = new Set(kept.map(p => p.wikiPage));

  // Ids must be unique; disambiguated pages ("Clear (Song Hyeon-min)") already slugify differently.
  const idOf = new Map();
  const usedIds = new Set();
  for (const p of kept) {
    let id = p.id;
    for (let n = 2; usedIds.has(id); n++) id = `${p.id}-${n}`;
    usedIds.add(id);
    idOf.set(p.wikiPage, id);
  }
  const teamId = name => slugify(name);

  const out = kept
    .map(p => ({
      id: idOf.get(p.wikiPage), nick: p.nick, name: p.name, wikiPage: p.wikiPage,
      retired: p.retired, coach: p.coach,
      teams: [...p.teams].map(teamId).sort(),
      leagues: [...p.leagues].sort(),
      trophies: [...p.trophies].sort(),
      teammates: [...p.teammates].filter(t => keptPages.has(t)).map(t => idOf.get(t)).sort(),
      tournaments: p.pages.size
    }))
    .sort((a, b) => a.nick.localeCompare(b.nick, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id));

  const franchises = new Map();
  for (const name of teamUsage.keys()) {
    // No logo → the game shows a text emblem; borrowing an old name's logo (e.g. Rebels Anarchy for DN Freecs) misleads.
    const info = teamInfo.get(name);
    const label = overrides.raw.labels?.[name] || name;
    const logo = overrides.raw.logos?.[name] || info?.Image || '';
    franchises.set(name, { id: teamId(name), name: label, page: name, short: overrides.raw.labels?.[name] ? label : info?.Short || label, logo, aliases: [], players: 0 });
  }
  for (const name of new Set([...teamInfo.keys(), ...teamNames])) {
    const org = franchiseOf(name);
    const f = franchises.get(org);
    // The organization's own page title counts as a former name when it is displayed under a newer label.
    if (f && name !== f.name && (name !== org || f.name !== org)) f.aliases.push(name);
  }
  out.forEach(p => p.teams.forEach(t => { const f = [...franchises.values()].find(x => x.id === t); if (f) f.players++; }));
  const teams = [...franchises.values()].filter(t => t.players > 0).sort((a, b) => b.players - a.players);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, 'players.json'), JSON.stringify(out) + '\n');
  await writeFile(path.join(DATA_DIR, 'players-index.json'), JSON.stringify(out.map(({ id, nick, name, tournaments }) => ({ id, nick, name, t: tournaments }))) + '\n');
  await writeFile(path.join(DATA_DIR, 'teams.json'), JSON.stringify(teams, null, 1) + '\n');

  step('Podsumowanie');
  console.log(`  graczy: ${out.length} (emeryci: ${out.filter(p => p.retired).length}, trenerzy: ${out.filter(p => p.coach).length})`);
  console.log(`  ligi: ${Object.keys(LEAGUES).map(l => `${l} ${out.filter(p => p.leagues.includes(l)).length}`).join(', ')}`);
  console.log(`  trofea: ${['worlds', 'msi', 'first-stand'].map(t => `${t} ${out.filter(p => p.trophies.includes(t)).length}`).join(', ')}`);
  console.log(`  drużyn: ${teams.length}; top: ${teams.slice(0, 8).map(t => `${t.short}(${t.players})`).join(' ')}`);
}

main().catch(e => { console.error('✗ ' + e.message); process.exitCode = 1; });
