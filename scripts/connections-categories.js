// Builds data/connections-categories.json — the pool the admin panel draws Connections boards from.
// Usage: node scripts/connections-categories.js --cards=<dir>
//   --cards  directory of card JSON files exported from the review page (status "yes" = approved players).
// Category membership (who else fits a category, approved or not) comes from .cache/connections-candidates/,
// so run `npm run connections-candidates -- all` first. A generated board never uses a player who also fits
// another category on the same board.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/puzzles.js';
import { nationalitiesOf } from './lib/connections-generator.js';

const CANDIDATES_DIR = path.join(ROOT, '.cache', 'connections-candidates');
const OUT = path.join(ROOT, 'data', 'connections-categories.json');
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);

// Candidate files are named after the category, except --team ones (team-<id>.json).
// ease 1 = most players know it (goes green), 4 = trivia (goes purple).
// `auto`: objective lists that need no review — every candidate with fame ≥ 2 counts as approved.
// `weight`: how often the generator picks it relative to other categories (default 1).
// `manual`: hand-picked lists with no candidate file — the players listed are the category (members included).
const CATEGORIES = {
  'worlds-winner': { ease: 1, auto: true, title: { pl: 'Mistrzowie świata', en: 'World Champions', es: 'Campeones del mundo', fr: 'Champions du monde' } },
  'team-geng': { ease: 1, title: { pl: 'Grali w Gen.G', en: 'Played for Gen.G', es: 'Jugaron en Gen.G', fr: 'Ont joué chez Gen.G' } },
  'msi-winner': { ease: 1, title: { pl: 'Zwycięzcy MSI', en: 'MSI Winners', es: 'Campeones del MSI', fr: 'Vainqueurs du MSI' } },
  'first-stand-winner': { ease: 2, title: { pl: 'Zwycięzcy First Stand', en: 'First Stand Winners', es: 'Campeones de First Stand', fr: 'Vainqueurs du First Stand' } },
  'lck-champion': { ease: 2, title: { pl: 'Mistrzowie LCK', en: 'LCK Champions', es: 'Campeones de la LCK', fr: 'Champions de la LCK' } },
  'lpl-champion': { ease: 2, title: { pl: 'Mistrzowie LPL', en: 'LPL Champions', es: 'Campeones de la LPL', fr: 'Champions de la LPL' } },
  'lec-champion': { ease: 2, title: { pl: 'Mistrzowie LEC', en: 'LEC Champions', es: 'Campeones de la LEC', fr: 'Champions de la LEC' } },
  'lcs-champion': { ease: 2, title: { pl: 'Mistrzowie LCS', en: 'LCS Champions', es: 'Campeones de la LCS', fr: 'Champions de la LCS' } },
  'msi-multi': { ease: 2, title: { pl: 'Wygrali MSI więcej niż raz', en: 'Won MSI more than once', es: 'Ganaron el MSI más de una vez', fr: "Ont remporté le MSI plus d'une fois" } },
  'worlds-and-msi': { ease: 2, title: { pl: 'Wygrali i Worlds, i MSI', en: 'Won both Worlds and MSI', es: 'Ganaron Worlds y MSI', fr: 'Ont remporté les Worlds et le MSI' } },
  'finals-mvp': { ease: 2, title: { pl: 'Finals MVP na Worlds', en: 'Worlds Finals MVP', es: 'MVP de la final de Worlds', fr: 'MVP de la finale des Worlds' } },
  'role-swap': { ease: 3, title: { pl: 'Zmienili rolę w karierze', en: 'Swapped roles during their career', es: 'Cambiaron de rol en su carrera', fr: 'Ont changé de rôle pendant leur carrière' } },
  'player-to-coach': { ease: 3, title: { pl: 'Z gracza trenerem', en: 'Went from player to coach', es: 'Pasaron de jugador a entrenador', fr: 'Sont passés de joueur à coach' } },
  'three-regions': { ease: 3, title: { pl: 'Grali w min. 3 głównych regionach', en: 'Played in at least 3 major regions', es: 'Jugaron en al menos 3 regiones principales', fr: 'Ont joué dans au moins 3 grandes régions' } },
  'worlds-final-both': { ease: 3, title: { pl: 'Grali w finale Worlds po obu stronach', en: 'Played a Worlds final on both sides', es: 'Jugaron una final de Worlds en ambos lados', fr: 'Ont joué une finale des Worlds des deux côtés' } },
  'one-club': { ease: 4, title: { pl: 'Całą tier 1 karierę w jednym klubie', en: 'Whole tier 1 career at one club', es: 'Toda su carrera tier 1 en un solo club', fr: 'Toute leur carrière tier 1 dans un seul club' } },
  'nick-change': { ease: 4, title: { pl: 'Zmienili nick w trakcie kariery', en: 'Changed their nickname during their career', es: 'Cambiaron de nick durante su carrera', fr: 'Ont changé de pseudo pendant leur carrière' } },
  'worlds-no-final': { ease: 4, title: { pl: 'Wygrali Worlds, nie grając w finale', en: 'Won Worlds without playing in the final', es: 'Ganaron Worlds sin jugar la final', fr: 'Ont gagné les Worlds sans jouer la finale' } },
  'named-play': { ease: 3, weight: 0.3, title: { pl: 'Zagranie nazwane ich nickiem', en: 'Have a play named after them', es: 'Tienen una jugada con su nombre', fr: 'Ont une action qui porte leur nom' }, manual: [
    { id: 'insec', facts: '„insec” – Lee Sin wkopujący rywala w swoją drużynę' },
    { id: 'xpeke', facts: '„xPeke” – samotny backdoor na Nexusa (Kassadin, IEM Katowice 2013)' },
    { id: 'madlife', facts: '„Madlife” – hak trafiony z przewidywaniem ruchu rywala' },
    { id: 'flame', facts: '„Flame Horizon” – 100 CS przewagi nad rywalem z linii' },
    { id: 'cpt-jack', facts: 'zagranie nazwane jego nickiem' }
  ] }
};
const AUTO_MIN_FAME = 2;
// Every approved player carries their nationalities (primary first) — the generator builds nationality groups from them.
const playerById = new Map(JSON.parse(await readFile(path.join(ROOT, 'data', 'players.json'), 'utf8')).map(p => [p.id, p]));

/** "Worlds 2017 (Samsung Galaxy)"-style facts for the category explanation; nick-change cards list names instead. */
const facts = card => card.names
  ? card.names.map(n => `${n.nick} (${n.years.replace(/^(\d{4})–\1$/, '$1')})`).join(' → ')
  : (card.lines || []).map(l => (l.sub ? `${l.title} (${l.sub})` : l.title)).join(', ');

const cardsDir = arg('cards');
if (!cardsDir) throw new Error('Podaj --cards=<katalog z kartami>');
const cards = [];
for (const f of (await readdir(cardsDir)).filter(f => f.endsWith('.json'))) cards.push(JSON.parse(await readFile(path.join(cardsDir, f), 'utf8')));

const out = [];
for (const [key, meta] of Object.entries(CATEGORIES)) {
  if (meta.manual) {
    const players = meta.manual.map(m => ({ id: m.id, nick: playerById.get(m.id).nick, facts: m.facts,
      nationality: nationalitiesOf(playerById.get(m.id)) }));
    out.push({ key, ease: meta.ease, ...(meta.weight ? { weight: meta.weight } : {}), title: meta.title, players, members: players.map(p => p.id).sort() });
    console.log(`${key.padEnd(18)} ręczna lista: ${players.length}`);
    continue;
  }
  let candidates;
  try { candidates = JSON.parse(await readFile(path.join(CANDIDATES_DIR, `${key}.json`), 'utf8')).candidates; }
  catch { console.warn(`⚠ ${key}: brak .cache/connections-candidates/${key}.json — pomijam`); continue; }
  const approved = meta.auto
    ? candidates.filter(c => c.fame >= AUTO_MIN_FAME).map(c => ({ id: c.id, nick: c.nick, facts: facts(c) }))
    : cards.filter(c => c.category === key && c.status === 'yes').map(c => ({ id: c.playerId, nick: c.player, facts: facts(c) }));
  const players = approved
    .map(p => ({ ...p, nationality: nationalitiesOf(playerById.get(p.id) || {}) }))
    .sort((a, b) => a.nick.localeCompare(b.nick, 'en', { sensitivity: 'base' }));
  out.push({ key, ease: meta.ease, ...(meta.weight ? { weight: meta.weight } : {}), title: meta.title, players, members: candidates.map(c => c.id).sort() });
  console.log(`${key.padEnd(18)} zatwierdzonych ${String(players.length).padStart(3)} / wszystkich pasujących ${candidates.length}`);
}

await writeFile(OUT, JSON.stringify({ categories: out }, null, 1) + '\n');
console.log(`\n${out.length} kategorii → data/connections-categories.json`);
