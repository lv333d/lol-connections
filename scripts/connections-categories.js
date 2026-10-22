// Builds data/connections-categories.json — the pool the admin panel draws Connections boards from.
// Usage: node scripts/connections-categories.js --cards=<dir>
//   --cards  directory of card JSON files exported from the review page (status "yes" = approved players).
// Category membership (who else fits a category, approved or not) comes from .cache/connections-candidates/,
// so run `npm run connections-candidates -- all` first. A generated board never uses a player who also fits
// another category on the same board.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/puzzles.js';

const CANDIDATES_DIR = path.join(ROOT, '.cache', 'connections-candidates');
const OUT = path.join(ROOT, 'data', 'connections-categories.json');
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);

// Candidate files are named after the category, except --team ones (team-<id>.json).
// ease 1 = most players know it (goes green), 4 = trivia (goes purple).
// `auto`: objective lists that need no review — every candidate with fame ≥ 2 counts as approved.
const CATEGORIES = {
  'worlds-winner': { ease: 1, auto: true, title: { pl: 'Mistrzowie świata', en: 'World Champions', es: 'Campeones del mundo', fr: 'Champions du monde' } },
  'team-geng': { ease: 1, title: { pl: 'Grali w Gen.G', en: 'Played for Gen.G', es: 'Jugaron en Gen.G', fr: 'Ont joué chez Gen.G' } },
  'msi-multi': { ease: 2, title: { pl: 'Wygrali MSI więcej niż raz', en: 'Won MSI more than once', es: 'Ganaron el MSI más de una vez', fr: "Ont remporté le MSI plus d'une fois" } },
  'worlds-and-msi': { ease: 2, title: { pl: 'Wygrali i Worlds, i MSI', en: 'Won both Worlds and MSI', es: 'Ganaron Worlds y MSI', fr: 'Ont remporté les Worlds et le MSI' } },
  'finals-mvp': { ease: 2, title: { pl: 'Finals MVP na Worlds', en: 'Worlds Finals MVP', es: 'MVP de la final de Worlds', fr: 'MVP de la finale des Worlds' } },
  'role-swap': { ease: 3, title: { pl: 'Zmienili rolę w karierze', en: 'Swapped roles during their career', es: 'Cambiaron de rol en su carrera', fr: 'Ont changé de rôle pendant leur carrière' } },
  'player-to-coach': { ease: 3, title: { pl: 'Z gracza trenerem', en: 'Went from player to coach', es: 'Pasaron de jugador a entrenador', fr: 'Sont passés de joueur à coach' } },
  'three-regions': { ease: 3, title: { pl: 'Grali w min. 3 głównych regionach', en: 'Played in at least 3 major regions', es: 'Jugaron en al menos 3 regiones principales', fr: 'Ont joué dans au moins 3 grandes régions' } },
  'worlds-final-both': { ease: 3, title: { pl: 'Grali w finale Worlds po obu stronach', en: 'Played a Worlds final on both sides', es: 'Jugaron una final de Worlds en ambos lados', fr: 'Ont joué une finale des Worlds des deux côtés' } },
  'one-club': { ease: 4, title: { pl: 'Całą tier 1 karierę w jednym klubie', en: 'Whole tier 1 career at one club', es: 'Toda su carrera tier 1 en un solo club', fr: 'Toute leur carrière tier 1 dans un seul club' } },
  'nick-change': { ease: 4, title: { pl: 'Zmienili nick w trakcie kariery', en: 'Changed their nickname during their career', es: 'Cambiaron de nick durante su carrera', fr: 'Ont changé de pseudo pendant leur carrière' } },
  'worlds-no-final': { ease: 4, title: { pl: 'Wygrali Worlds, nie grając w finale', en: 'Won Worlds without playing in the final', es: 'Ganaron Worlds sin jugar la final', fr: 'Ont gagné les Worlds sans jouer la finale' } }
};
const AUTO_MIN_FAME = 2;

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
  let candidates;
  try { candidates = JSON.parse(await readFile(path.join(CANDIDATES_DIR, `${key}.json`), 'utf8')).candidates; }
  catch { console.warn(`⚠ ${key}: brak .cache/connections-candidates/${key}.json — pomijam`); continue; }
  const approved = meta.auto
    ? candidates.filter(c => c.fame >= AUTO_MIN_FAME).map(c => ({ id: c.id, nick: c.nick, facts: facts(c) }))
    : cards.filter(c => c.category === key && c.status === 'yes').map(c => ({ id: c.playerId, nick: c.player, facts: facts(c) }));
  const players = approved
    .sort((a, b) => a.nick.localeCompare(b.nick, 'en', { sensitivity: 'base' }));
  out.push({ key, ease: meta.ease, title: meta.title, players, members: candidates.map(c => c.id).sort() });
  console.log(`${key.padEnd(18)} zatwierdzonych ${String(players.length).padStart(3)} / wszystkich pasujących ${candidates.length}`);
}

await writeFile(OUT, JSON.stringify({ categories: out }, null, 1) + '\n');
console.log(`\n${out.length} kategorii → data/connections-categories.json`);
