/* ==========================================================================
   Guess the Pro — Game Logic
   One pro player a day (guess/YYYY-MM-DD.json). Every guess is compared with the answer on nationality,
   current league, current team, international titles and tier-1 debut year, and shows 🤝 when the two
   played on one roster. Player data: data/guess-players.json (scripts/build-guess-pool.js).
   ========================================================================== */

const LANGS = ['pl', 'en', 'es', 'fr'];
const LOCALE_MAP = { pl: 'pl-PL', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
const MAX_RESULTS = 30;
const MAJOR_LEAGUES = ['LCK', 'LPL', 'LEC', 'LCS', 'LTA'];

const I18N = {
  pl: {
    subtitle: 'codzienna zagadka League of Legends',
    noPuzzleTitle: '📅 Brak gracza na dziś', noPuzzleText: 'Wróć jutro po nową zagadkę!',
    nextBoardIn: 'Nowy gracz za', nextBoardSoon: 'Nowy gracz już wkrótce',
    guessesLabel: 'Próby:', giveUp: 'Poddaj się', results: 'Wyniki',
    searchPh: 'Wpisz nick lub imię gracza…', noResults: 'Brak graczy o takim nicku.', used: 'już był',
    colPlayer: 'Gracz', colNat: 'Kraj', colPos: 'Pozycja', colLeague: 'Liga', colTeam: 'Drużyna', colTitles: 'Trofea międzynar.', colDebut: 'Debiut tier\u00A01',
    roles: { top: 'Top', jungle: 'Jungle', mid: 'Mid', bot: 'Bot', support: 'Support' }, sharedOrg: 'Szukany gracz grał kiedyś w {teams}',
    natPart: 'zgadza się jedna z narodowości',
    leaguePart: 'Szukany gracz grał kiedyś w tej lidze',
    otherLeague: 'inna', otherLeagueLong: 'Inna liga (poza LCK, LPL, LEC, LCS i LTA)', moreRows: '… +{n} …',
    none: 'brak', higher: 'Więcej', lower: 'Mniej', later: 'Później', earlier: 'Wcześniej',
    together: 'Był w jednym składzie z szukanym graczem', answerWas: 'Szukany gracz',
    winTitle: '🏆 Zgadnięte!', loseTitle: '⚔ Koniec gry',
    share: '𝕏 Udostępnij wynik', shareNative: '📤 Udostępnij wynik', copy: '📋 Kopiuj wynik', copied: 'Skopiowano!',
    giveUpTitle: 'Poddać się?', giveUpText: 'Gra się zakończy i zobaczysz szukanego gracza. Tego nie da się cofnąć.',
    giveUpConfirm: 'Poddaj się', giveUpCancel: 'Graj dalej',
    guideTitle: '📖 Jak grać', btnGuideLabel: 'Poradnik',
    guide: [
      ['Cel', 'Odgadnij dzisiejszego pro-gracza. Każdy z nich co najmniej dwa razy grał na Worlds, MSI lub First Stand w drużynie z LCK, LPL, LEC, LCS lub LTA.'],
      ['Jak grać', 'Wpisz nick lub imię gracza i wybierz go z listy. Liczba prób jest nieograniczona. Po każdej zobaczysz, co twój typ ma wspólnego z szukanym graczem: <strong>zielone</strong> pole to zgodność, <strong>żółte</strong> — częściowa zgodność, <strong>czerwone</strong> — różnica. Strzałka przy liczbie pokazuje, czy szukana wartość jest większa (↑) czy mniejsza (↓).'],
      ['Kategorie', '<strong>Narodowość</strong> (przy podwójnej obie flagi; <strong>żółta</strong>, gdy zgadza się jedna z nich); <strong>pozycja</strong> — najczęstsza w składach turniejowych; <strong>obecna liga</strong> (LCK, LPL, LEC, LCS, LTA albo „inna” dla drużyn z innych lig) i <strong>obecna drużyna</strong> — według profilu na Leaguepedii, „brak” dla emerytów i graczy bez drużyny; liga i drużyna są <strong>żółte</strong>, gdy szukany gracz grał kiedyś w obecnej lidze lub obecnej drużynie twojego typu (niekoniecznie razem z nim); <strong>trofea międzynarodowe</strong> — wygrane Worlds, MSI i First Stand jako zawodnik; <strong>debiut w tier 1</strong> — rok pierwszego składu w LCK, LPL, LEC, LCS lub LTA.'],
      ['W jednym składzie', 'Napis „Był w jednym składzie z szukanym graczem” pojawia się pod typem, który był z szukanym graczem w tym samym czasie w składzie jednej drużyny, w lidze głównej lub na turnieju międzynarodowym.'],
      ['Nowy gracz', 'Codziennie o 00:00 UTC.']
    ]
  },
  en: {
    subtitle: 'daily League of Legends puzzle',
    noPuzzleTitle: '📅 No player today', noPuzzleText: 'Come back tomorrow for a new puzzle!',
    nextBoardIn: 'New player in', nextBoardSoon: 'New player coming soon',
    guessesLabel: 'Guesses:', giveUp: 'Give up', results: 'Results',
    searchPh: 'Type a nickname or real name…', noResults: 'No player matches.', used: 'guessed',
    colPlayer: 'Player', colNat: 'Country', colPos: 'Position', colLeague: 'League', colTeam: 'Team', colTitles: 'Int\'l titles', colDebut: 'Tier\u00A01 debut',
    roles: { top: 'Top', jungle: 'Jungle', mid: 'Mid', bot: 'Bot', support: 'Support' }, sharedOrg: 'The answer played for {teams} at some point',
    natPart: 'one of the nationalities matches',
    leaguePart: 'The answer played in this league at some point',
    otherLeague: 'other', otherLeagueLong: 'Other region (outside LCK, LPL, LEC, LCS and LTA)', moreRows: '… +{n} …',
    none: 'none', higher: 'Higher', lower: 'Lower', later: 'Later', earlier: 'Earlier',
    together: 'Was on a roster with the answer', answerWas: 'The player was',
    winTitle: '🏆 Got it!', loseTitle: '⚔ Game over',
    share: '𝕏 Share result', shareNative: '📤 Share result', copy: '📋 Copy result', copied: 'Copied!',
    giveUpTitle: 'Give up?', giveUpText: 'The game ends and the player is revealed. This cannot be undone.',
    giveUpConfirm: 'Give up', giveUpCancel: 'Keep playing',
    guideTitle: '📖 How to play', btnGuideLabel: 'Guide',
    guide: [
      ['Goal', 'Guess today\'s pro player. Every one of them played at least two Worlds, MSI or First Stand events for an LCK, LPL, LEC, LCS or LTA team.'],
      ['How to play', 'Type a nickname or real name and pick the player from the list. Guesses are unlimited. After each one you see what your pick shares with the answer: <strong>green</strong> means a match, <strong>yellow</strong> a partial match, <strong>red</strong> a difference. The arrow next to a number shows whether the answer\'s value is higher (↑) or lower (↓).'],
      ['Categories', '<strong>Nationality</strong> (dual nationals show both flags; <strong>yellow</strong> when one of them matches); <strong>position</strong> — the most frequent one on their rosters; <strong>current league</strong> (LCK, LPL, LEC, LCS, LTA or “other” for teams in any other league) and <strong>current team</strong> — from the Leaguepedia profile, “none” for retired and teamless players; the league and the team are <strong>yellow</strong> when the answer played in your pick\'s current league or for their current team at some point (not necessarily together); <strong>international titles</strong> — Worlds, MSI and First Stand won as a player; <strong>tier 1 debut</strong> — year of the first LCK, LPL, LEC, LCS or LTA roster.'],
      ['Same roster', '“Was on a roster with the answer” appears under a guess who was on the same team\'s roster as the answer at the same time, in a major league or at an international event.'],
      ['New player', 'Every day at 00:00 UTC.']
    ]
  },
  es: {
    subtitle: 'acertijo diario de League of Legends',
    noPuzzleTitle: '📅 No hay jugador hoy', noPuzzleText: '¡Vuelve mañana por un nuevo acertijo!',
    nextBoardIn: 'Nuevo jugador en', nextBoardSoon: 'Nuevo jugador muy pronto',
    guessesLabel: 'Intentos:', giveUp: 'Rendirse', results: 'Resultados',
    searchPh: 'Escribe un nick o nombre…', noResults: 'Ningún jugador coincide.', used: 'ya probado',
    colPlayer: 'Jugador', colNat: 'País', colPos: 'Posición', colLeague: 'Liga', colTeam: 'Equipo', colTitles: 'Títulos int.', colDebut: 'Debut tier\u00A01',
    roles: { top: 'Top', jungle: 'Jungla', mid: 'Mid', bot: 'Bot', support: 'Support' }, sharedOrg: 'El jugador buscado jugó en {teams} en algún momento',
    natPart: 'coincide una de las nacionalidades',
    leaguePart: 'El jugador buscado jugó en esta liga en algún momento',
    otherLeague: 'otra', otherLeagueLong: 'Otra región (fuera de LCK, LPL, LEC, LCS y LTA)', moreRows: '… +{n} …',
    none: 'ninguno', higher: 'Más', lower: 'Menos', later: 'Más tarde', earlier: 'Antes',
    together: 'Estuvo en el mismo roster que el jugador buscado', answerWas: 'El jugador era',
    winTitle: '🏆 ¡Acertaste!', loseTitle: '⚔ Fin del juego',
    share: '𝕏 Compartir resultado', shareNative: '📤 Compartir resultado', copy: '📋 Copiar resultado', copied: '¡Copiado!',
    giveUpTitle: '¿Rendirse?', giveUpText: 'La partida termina y se revela el jugador. No se puede deshacer.',
    giveUpConfirm: 'Rendirse', giveUpCancel: 'Seguir jugando',
    guideTitle: '📖 Cómo jugar', btnGuideLabel: 'Guía',
    guide: [
      ['Objetivo', 'Adivina el jugador pro de hoy. Todos jugaron al menos dos veces en Worlds, MSI o First Stand con un equipo de LCK, LPL, LEC, LCS o LTA.'],
      ['Cómo jugar', 'Escribe un nick o nombre real y elige al jugador de la lista. Los intentos son ilimitados. Tras cada uno verás qué comparte tu elección con la respuesta: <strong>verde</strong> es coincidencia, <strong>amarillo</strong> coincidencia parcial, <strong>rojo</strong> una diferencia. La flecha junto a un número indica si el valor buscado es mayor (↑) o menor (↓).'],
      ['Categorías', '<strong>Nacionalidad</strong> (con doble nacionalidad, ambas banderas; <strong>amarillo</strong> si coincide una); <strong>posición</strong>: la más frecuente en sus rosters; <strong>liga actual</strong> (LCK, LPL, LEC, LCS, LTA u «otra» para equipos de otras ligas) y <strong>equipo actual</strong>: según su perfil en Leaguepedia, «ninguno» para retirados y jugadores sin equipo; la liga y el equipo salen en <strong>amarillo</strong> cuando el jugador buscado jugó alguna vez en la liga actual o en el equipo actual de tu intento (no necesariamente juntos); <strong>títulos internacionales</strong>: Worlds, MSI y First Stand ganados como jugador; <strong>debut en tier 1</strong>: año del primer roster en LCK, LPL, LEC, LCS o LTA.'],
      ['Mismo roster', '«Estuvo en el mismo roster que el jugador buscado» aparece bajo un intento que estuvo a la vez en el roster del mismo equipo que la respuesta, en una liga principal o en un torneo internacional.'],
      ['Nuevo jugador', 'Cada día a las 00:00 UTC.']
    ]
  },
  fr: {
    subtitle: 'énigme quotidienne de League of Legends',
    noPuzzleTitle: '📅 Pas de joueur aujourd\'hui', noPuzzleText: 'Revenez demain pour une nouvelle énigme !',
    nextBoardIn: 'Nouveau joueur dans', nextBoardSoon: 'Nouveau joueur très bientôt',
    guessesLabel: 'Essais :', giveUp: 'Abandonner', results: 'Résultats',
    searchPh: 'Tapez un pseudo ou un nom…', noResults: 'Aucun joueur trouvé.', used: 'déjà essayé',
    colPlayer: 'Joueur', colNat: 'Pays', colPos: 'Poste', colLeague: 'Ligue', colTeam: 'Équipe', colTitles: 'Titres int.', colDebut: 'Débuts tier\u00A01',
    roles: { top: 'Top', jungle: 'Jungle', mid: 'Mid', bot: 'Bot', support: 'Support' }, sharedOrg: 'Le joueur recherché a joué pour {teams} à un moment',
    natPart: 'une des nationalités correspond',
    leaguePart: 'Le joueur recherché a joué dans cette ligue à un moment',
    otherLeague: 'autre', otherLeagueLong: 'Autre région (hors LCK, LPL, LEC, LCS et LTA)', moreRows: '… +{n} …',
    none: 'aucune', higher: 'Plus', lower: 'Moins', later: 'Plus tard', earlier: 'Plus tôt',
    together: 'A fait partie du même roster que le joueur recherché', answerWas: 'Le joueur était',
    winTitle: '🏆 Trouvé !', loseTitle: '⚔ Partie terminée',
    share: '𝕏 Partager le résultat', shareNative: '📤 Partager le résultat', copy: '📋 Copier le résultat', copied: 'Copié !',
    giveUpTitle: 'Abandonner ?', giveUpText: 'La partie se termine et le joueur est révélé. Impossible de revenir en arrière.',
    giveUpConfirm: 'Abandonner', giveUpCancel: 'Continuer',
    guideTitle: '📖 Comment jouer', btnGuideLabel: 'Guide',
    guide: [
      ['Objectif', 'Devinez le joueur pro du jour. Tous ont joué au moins deux fois aux Worlds, au MSI ou au First Stand avec une équipe de LCK, LPL, LEC, LCS ou LTA.'],
      ['Comment jouer', 'Tapez un pseudo ou un nom et choisissez le joueur dans la liste. Les essais sont illimités. Après chacun, vous voyez ce que votre choix partage avec la réponse : <strong>vert</strong> pour une correspondance, <strong>jaune</strong> pour une correspondance partielle, <strong>rouge</strong> pour une différence. La flèche à côté d\'un nombre indique si la valeur cherchée est plus grande (↑) ou plus petite (↓).'],
      ['Catégories', '<strong>Nationalité</strong> (double nationalité : les deux drapeaux ; <strong>jaune</strong> si l\'une correspond) ; <strong>poste</strong> : le plus fréquent dans ses rosters ; <strong>ligue actuelle</strong> (LCK, LPL, LEC, LCS, LTA ou « autre » pour les équipes d\'autres ligues) et <strong>équipe actuelle</strong> : selon son profil Leaguepedia, « aucune » pour les retraités et les joueurs sans équipe ; la ligue et l\'équipe sont en <strong>jaune</strong> quand le joueur recherché a joué dans la ligue actuelle ou pour l\'équipe actuelle de votre essai à un moment (pas forcément ensemble) ; <strong>titres internationaux</strong> : Worlds, MSI et First Stand gagnés en tant que joueur ; <strong>débuts en tier 1</strong> : année du premier roster en LCK, LPL, LEC, LCS ou LTA.'],
      ['Même roster', '« A fait partie du même roster que le joueur recherché » apparaît sous un essai qui était dans le roster de la même équipe que la réponse au même moment, dans une ligue majeure ou lors d\'un tournoi international.'],
      ['Nouveau joueur', 'Chaque jour à 00:00 UTC.']
    ]
  }
};

// Helpers
const $ = id => document.getElementById(id);
let currentLang = SITE.lang; // site.js: the URL's language on built pages

const fill = (s, vars) => Object.keys(vars || {}).reduce((acc, k) => acc.replace(`{${k}}`, vars[k]), s);
const t = (key, vars) => fill((I18N[currentLang] && I18N[currentLang][key]) ?? I18N.en[key] ?? key, vars);
const esc = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const normalize = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9가-힣一-龥]/g, '');
const todayKey = () => new Date().toISOString().slice(0, 10);
const addDays = (dateStr, days) => { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

// State
let availableDates = [], selectedDate = '', selectedDateIndex = -1;
let nextBoardDate = '', countdownTimer = null;
let day = null;      // { date, number, playerId }
let answer = null;   // pool entry of day.playerId
let state = null;    // { guesses: [id], gameOver, won }
let players = [];    // data/guess-players.json + normalized search keys
let playerById = new Map();
let loadSeq = 0;
let activeResult = -1, resultItems = [], justAdded = '';

// Admin preview (admin.html): ?preview=YYYY-MM-DD opens that day — future ones too — as a fresh game that is never
// saved; &solved=1 shows it finished with the answer revealed. Local admin server only.
const previewParams = new URLSearchParams(location.search);
const PREVIEW = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname)
  && /^\d{4}-\d{2}-\d{2}$/.test(previewParams.get('preview') || '') ? previewParams.get('preview') : '';

const stateKey = date => `lolgp_state_${date}`;
const loadState = date => { if (PREVIEW) return null; try { return JSON.parse(localStorage.getItem(stateKey(date))); } catch { return null; } };
const saveState = () => { if (PREVIEW) return; try { localStorage.setItem(stateKey(selectedDate), JSON.stringify(state)); } catch { /* storage blocked */ } };
const newState = () => ({ guesses: [], gameOver: false, won: false });

async function fetchJson(url, { revalidate = false } = {}) {
  try {
    const res = await (revalidate ? fetch(url, { cache: 'no-cache' }) : fetch(url + '?_=' + Date.now()));
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.warn('Nie udało się pobrać ' + url, e);
    return null;
  }
}

/* ---------- Rendering helpers ---------- */

/** Portrait from players/{id}.webp, falling back to initials when the file is missing. */
function avatar(id, nick) {
  const img = el('img', 'avatar');
  img.src = `players/${encodeURIComponent(id)}.webp`;
  img.alt = '';
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    const fallback = el('span', img.className + ' initials');
    fallback.textContent = (nick || '?').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?';
    img.replaceWith(fallback);
  }, { once: true });
  return img;
}

/** Image with a text emblem fallback. */
function logo(src, emblemClass, text, attrs = {}) {
  const emblem = () => {
    const e = el('div', 'emblem ' + emblemClass);
    e.textContent = text;
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  };
  if (!src) return emblem();
  const img = el('img');
  img.src = src;
  img.alt = text;
  // The emblem appears only after the image failed, so it is fitted then (team names without a logo can be long).
  img.addEventListener('error', () => { const e = emblem(); img.replaceWith(e); requestAnimationFrame(() => fitText(e)); }, { once: true });
  return img;
}

function countryName(code) {
  try { return new Intl.DisplayNames([currentLang], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase(); }
  catch { return code.toUpperCase(); }
}

/* ---------- Comparison ---------- */

// Every nationality of a player (dual nationals have `nats`, the primary one first).
const natsOf = p => p.nats || (p.nat ? [p.nat] : []);
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

/** One guess against the answer: per category { ok: true | false | 'part', … } plus `together`. */
function compare(g) {
  const num = (a, b) => (a === b ? { ok: true } : { ok: false, dir: b > a ? 'up' : 'down' });
  // Team: green for the same current team; yellow when the guess's current team is an organization the answer
  // played for at some point (Caps of G2 while the answer is Trick: never teammates, but Trick played for G2).
  const sameTeam = (g.team?.id || '') === (answer.team?.id || '');
  const shared = g.team && (answer.orgs || []).includes(g.team.name) ? [g.team.name] : [];
  return {
    nat: { ok: sameSet(natsOf(g), natsOf(answer)) || (natsOf(g).some(n => natsOf(answer).includes(n)) ? 'part' : false) },
    role: { ok: g.role === answer.role },
    // League: yellow like the team — the guess's current league is one the answer played in at some point.
    league: { ok: (g.league || '') === (answer.league || '') || (g.league && (answer.leagues || []).includes(g.league) ? 'part' : false) },
    team: { ok: sameTeam || (shared.length ? 'part' : false), shared },
    titles: num(g.titles, answer.titles),
    debut: num(g.debut, answer.debut),
    together: g.id !== answer.id && answer.with.includes(g.id)
  };
}

function tile(cls, ok, title, ...children) {
  const c = el('div', `gp-cell ${cls} ${ok === 'part' ? 'part' : ok ? 'ok' : 'no'}`);
  c.setAttribute('role', 'cell');
  c.title = title;
  c.addEventListener('click', () => showToast(title));
  children.forEach(ch => c.appendChild(typeof ch === 'string' ? el('span', '', esc(ch)) : ch));
  return c;
}

// Dual nationals show both flags; yellow when only some of the nationalities match.
function natTile(p, ok) {
  const nats = natsOf(p);
  if (!nats.length) return tile('gp-nat', ok, '?', el('span', 'gp-text', '?'));
  const names = nats.map(countryName).join(', ');
  const title = ok === 'part' ? `${names} — ${t('natPart')}` : names;
  const flags = nats.map(n => logo(`assets/flags/${encodeURIComponent(n)}.svg`, 'emblem-team', n.toUpperCase()));
  if (flags.length === 1) return tile('gp-nat', ok, title, flags[0]);
  const stack = el('div', 'gp-flags');
  flags.forEach(f => stack.appendChild(f));
  return tile('gp-nat gp-multi', ok, title, stack);
}

// In-game position icons, traced from the official role icons (white = the lane, dim = the rest of the map frame).
const ROLE_ICONS = {
  top: ['M122.8 128.4 63.0 128.4 46.5 127.9 36.0 127.9 29.8 128.4 29.1 128.0 28.9 127.0 38.8 117.9 46.0 110.1 46.9 109.8 47.5 108.1 49.8 106.9 106.5 106.9 106.9 106.2 106.4 105.0 106.6 50.2 107.1 49.0 108.9 47.0 110.5 46.1 111.1 45.0 115.4 41.2 115.9 40.2 124.1 32.2 125.8 30.1 127.8 29.4 128.6 30.2 128.6 121.8 128.4 126.5 127.9 127.5 127.0 128.1ZM59.8 87.1 58.0 87.1 56.5 86.4 55.9 85.5 56.1 57.0 57.5 56.4 85.8 56.6 86.1 58.0 85.6 85.8 83.5 86.9Z',
    'M14.0 116.1 13.1 115.8 13.4 15.5 14.8 14.9 114.0 15.1 114.4 15.5 114.1 16.2 94.5 35.9 93.8 36.1 36.0 36.1 35.6 36.5 35.4 94.5 34.9 95.5Z'],
  jungle: ['',
    'M70.5 132.9 62.9 122.8 55.5 114.6 45.5 105.1 34.1 96.5 32.6 81.2 29.6 67.0 26.9 61.2 21.9 52.8 15.1 43.5 15.2 42.9 16.5 42.9 22.8 46.1 35.5 54.9 42.9 62.5 46.4 67.5 50.1 75.0 51.2 76.4 51.6 76.2 51.9 71.5 51.1 57.8 49.9 47.5 44.6 29.5 43.9 28.5 42.9 24.8 37.9 12.8 37.2 10.1 38.9 11.2 43.9 18.5 45.6 20.2 53.9 33.2 58.9 42.5 65.6 57.0 69.6 67.2 72.6 76.5 74.6 85.0 75.6 91.8 75.6 106.5 73.6 123.0 72.9 124.5 71.9 130.2ZM83.5 80.9 82.9 80.2 81.9 74.5 79.9 68.8 76.4 62.0 73.9 58.2 73.6 56.2 85.1 35.0 101.1 12.2 103.2 10.1 103.6 10.8 101.9 14.2 100.9 18.0 100.1 19.0 98.9 23.2 97.9 25.0 97.9 26.0 96.1 29.8 95.9 31.5 92.6 40.2 90.6 48.5 89.9 49.8 88.6 57.0 88.4 64.8 88.9 68.5ZM88.5 113.4 87.9 113.0 87.4 103.8 87.9 96.5 88.6 95.2 88.9 93.2 92.1 83.0 98.1 69.8 103.9 60.5 108.1 55.2 112.2 51.1 121.2 44.9 124.8 43.4 124.6 44.2 121.1 48.2 117.9 53.2 115.9 56.8 115.9 57.5 113.1 61.8 110.1 68.2 107.4 81.0 106.4 97.8 96.2 105.1Z'],
  mid: ['M13.5 98.6 12.9 98.2 12.4 96.5 12.9 14.8 14.0 13.9 96.5 14.1 97.1 15.0 96.9 15.8 95.2 16.9 78.5 34.1 77.5 34.6 75.8 35.1 35.5 35.1 35.1 35.5 34.9 76.2 34.1 77.2 33.9 78.8 24.1 88.2 23.0 89.9 19.2 92.6 18.6 94.0ZM127.2 127.6 118.8 127.1 57.0 127.4 44.8 127.1 43.9 126.2 44.4 125.0 47.2 122.9 49.2 120.1 51.5 118.9 63.5 105.9 103.5 106.1 105.6 105.0 105.6 64.8 121.9 47.5 127.2 42.6 128.1 43.5 128.1 126.8Z',
    'M32.0 127.4 14.2 127.4 12.9 126.8 12.6 109.2 13.1 108.2 107.2 14.4 108.8 13.9 127.5 14.1 128.1 15.2 127.9 32.5 33.2 127.1Z'],
  bot: ['M14.2 112.9 13.2 112.6 12.9 112.0 12.9 16.2 13.4 15.0 14.8 14.1 111.8 14.1 112.4 15.0 112.1 15.8 92.8 34.9 38.0 34.9 35.5 35.4 34.9 36.0 35.1 92.2 31.1 96.8 23.0 104.9 21.6 105.8 21.0 106.9 18.0 109.1 17.1 110.5ZM83.5 85.9 56.5 85.9 55.6 85.2 55.4 56.8 56.2 55.6 85.0 55.6 85.6 56.0 86.1 83.5 85.2 85.1Z',
    'M127.2 127.4 27.8 127.4 27.4 126.2 47.2 106.1 105.8 105.9 105.9 48.2 106.9 46.5 109.0 44.4 127.2 26.1 128.0 26.1 128.4 26.5 128.4 126.2Z'],
  support: ['',
    'M70.5 45.6 68.9 44.2 49.9 22.2 50.1 20.8 53.1 14.8 54.8 12.9 87.2 12.9 90.9 20.0 91.4 21.2 91.1 22.5ZM91.5 78.4 89.9 76.8 89.6 74.8 88.9 73.5 85.9 62.8 84.9 60.8 84.9 59.5 81.9 51.2 81.9 49.0 94.5 36.1 95.8 35.6 98.2 35.6 138.6 37.2 138.6 38.2 137.0 39.9 130.0 45.6 119.0 51.6 111.8 53.4 101.2 53.1 100.9 54.5 109.9 67.0 111.1 69.0 111.1 70.0 107.8 71.9ZM50.5 78.4 36.0 72.9 32.0 70.9 31.0 70.9 29.9 70.0 30.1 68.8 39.9 55.2 40.4 54.0 40.0 53.1 29.0 53.1 21.2 50.6 14.5 47.6 9.5 44.6 3.9 39.5 3.1 38.5 3.1 37.5 3.5 37.1 46.8 37.4 58.6 49.5 51.9 76.0 51.4 77.5ZM70.8 127.9 69.8 127.9 55.5 115.9 54.1 114.5 54.1 113.8 54.9 111.8 54.9 109.5 57.9 96.0 57.9 93.8 58.9 90.8 59.1 87.2 59.9 85.5 59.9 83.5 62.6 70.8 62.9 67.2 63.4 66.5 65.4 54.5 66.2 53.9 70.5 58.6 74.1 54.2 75.2 53.6 75.9 54.5 77.9 66.2 79.1 71.0 79.1 73.0 79.9 75.0 82.1 88.2 83.9 95.0 83.9 97.0 87.6 114.5Z'],
};
function roleIcon(role) {
  const [dim, lit] = ROLE_ICONS[role];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 140 140');
  svg.setAttribute('fill-rule', 'evenodd');
  svg.setAttribute('class', 'gp-role-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = (dim ? `<path class="dim" d="${dim}"/>` : '') + `<path d="${lit}"/>`;
  return svg;
}
function roleTile(p, ok) {
  if (!p.role || !ROLE_ICONS[p.role]) return tile('gp-role', ok, '?', el('span', 'gp-text', '?'));
  return tile('gp-role', ok, t('roles')[p.role], roleIcon(p.role));
}

function leagueTile(p, ok) {
  if (!p.league) return tile('gp-league', ok, t('none'), el('span', 'gp-text gp-none', esc(t('none'))));
  // Any team outside the five major leagues: "other", the actual league in the tooltip.
  if (p.league === 'other') {
    return tile('gp-league', ok, t('otherLeagueLong') + (p.leagueName ? ` — ${p.leagueName}` : ''), el('span', 'gp-text', esc(t('otherLeague'))));
  }
  const major = MAJOR_LEAGUES.includes(p.league);
  return tile('gp-league', ok, ok === 'part' ? `${p.league} — ${t('leaguePart')}` : p.league, major
    ? logo(`assets/logos/leagues/${p.league}.webp`, 'emblem-league', p.league, { 'data-league': p.league })
    : el('span', 'gp-text', esc(p.league)));
}

function teamTile(p, cmp) {
  const ok = cmp.ok;
  const name = p.team ? p.team.name : t('none');
  const title = ok === 'part' ? `${name} — ${t('sharedOrg', { teams: cmp.shared.join(', ') })}` : name;
  if (!p.team) return tile('gp-team', ok, title, el('span', 'gp-text gp-none', esc(t('none'))));
  return tile('gp-team', ok, title, logo(`assets/logos/teams/${encodeURIComponent(p.team.id)}.webp`, 'emblem-team', p.team.short));
}

function numTile(cls, value, cmp, upKey, downKey) {
  const arrow = cmp.ok ? '' : cmp.dir === 'up' ? '↑' : '↓';
  const title = cmp.ok ? String(value) : `${value} — ${t(cmp.dir === 'up' ? upKey : downKey)}`;
  const c = tile(cls, cmp.ok, title, el('span', 'gp-num', esc(String(value))));
  if (arrow) c.appendChild(el('span', 'gp-arrow', arrow));
  return c;
}

function guessRow(p, animate, extraClass = '') {
  const cmp = compare(p);
  const row = el('div', 'gp-row' + (animate ? ' gp-new' : '') + (p.id === answer.id ? ' gp-correct' : '') + extraClass);
  row.setAttribute('role', 'row');
  const who = el('div', 'gp-player');
  who.setAttribute('role', 'cell');
  who.appendChild(avatar(p.id, p.nick));
  who.appendChild(el('span', 'gp-nick', esc(p.nick)));
  row.appendChild(who);
  row.appendChild(natTile(p, cmp.nat.ok));
  row.appendChild(roleTile(p, cmp.role.ok));
  row.appendChild(leagueTile(p, cmp.league.ok));
  row.appendChild(teamTile(p, cmp.team));
  row.appendChild(numTile('gp-titles', p.titles, cmp.titles, 'higher', 'lower'));
  row.appendChild(numTile('gp-debut', p.debut, cmp.debut, 'later', 'earlier'));
  if (cmp.together) {
    const note = el('div', 'gp-together', '🤝 ' + esc(t('together')));
    note.setAttribute('role', 'cell');
    row.appendChild(note);
  }
  return row;
}

/* ---------- Text that doesn't fit shrinks ---------- */

// Column headers, nicknames and the words inside tiles keep their size where they fit and get smaller where they
// don't (narrow phones, long nicks like "ShowMaker", long team names) — no cut words or "…".
const FIT_SELECTOR = '.gp-head > div, .gp-nick, .gp-cell .gp-text, .gp-cell .emblem';
const MIN_FONT_PX = 6;

function fitText(e) {
  e.style.fontSize = '';
  let size = parseFloat(getComputedStyle(e).fontSize);
  // A word wider than its box shows up as scrollWidth > clientWidth (words never break, see guess.css).
  while ((e.scrollWidth > e.clientWidth + 0.5 || e.scrollHeight > e.clientHeight + 0.5) && size > MIN_FONT_PX) {
    size -= 0.5;
    e.style.fontSize = size + 'px';
  }
  // A team name that still doesn't fit (a very long one on a narrow phone) becomes its initials; the tile's tooltip
  // keeps the full name.
  if (e.classList.contains('emblem') && e.scrollWidth > e.clientWidth + 0.5 && !e.dataset.short) {
    e.dataset.short = '1';
    e.textContent = e.textContent.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
    fitText(e);
  }
}
const fitAll = (root = document) => root.querySelectorAll(FIT_SELECTOR).forEach(fitText);
let fitFrame = 0;
const scheduleFit = () => { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(() => fitAll()); };
window.addEventListener('resize', scheduleFit);
document.fonts?.ready.then(scheduleFit); // sizes change once the web fonts are in

/* ---------- Game ---------- */

function applyI18n() {
  document.documentElement.lang = currentLang;
  // The same keys are filled into the HTML at build time (scripts/build-site.js), so built pages don't change here.
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.dataset.i18nPh); });
  if (canNativeShare()) $('btnShare').textContent = t('shareNative');
  $('langSelect').value = currentLang;
  $('dateDisplay').textContent = selectedDate ? formatDate(selectedDate) : '';
  renderCountdown();
  $('guideContent').innerHTML = t('guide').map(([h, p]) => `<div class="guide-section"><h3>${h}</h3><p>${p}</p></div>`).join('');
  scheduleFit();
}

function renderCountdown() {
  const box = $('nextBoard');
  box.classList.toggle('hidden', !nextBoardDate);
  if (!nextBoardDate) return;
  const ms = Date.parse(nextBoardDate + 'T00:00:00Z') - Date.now();
  if (ms <= 0) { $('nextBoardLabel').textContent = t('nextBoardSoon'); $('nextBoardTime').textContent = ''; return; }
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
  const hms = [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
  $('nextBoardLabel').textContent = t('nextBoardIn');
  $('nextBoardTime').textContent = `${d > 0 ? d + 'd ' : ''}${hms}`;
}

function startCountdown() {
  clearInterval(countdownTimer);
  renderCountdown();
  if (nextBoardDate) countdownTimer = setInterval(renderCountdown, 1000);
}

const narrowScreen = window.matchMedia('(max-width: 520px)');
const formatDate = d => new Date(d + 'T00:00:00').toLocaleDateString(LOCALE_MAP[currentLang], narrowScreen.matches
  ? { year: 'numeric', month: 'short', day: 'numeric' }
  : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
narrowScreen.addEventListener('change', () => { if (selectedDate) $('dateDisplay').textContent = formatDate(selectedDate); });

function updateNavButtons() {
  $('btnPrevDate').disabled = selectedDateIndex <= 0;
  $('btnNextDate').disabled = selectedDateIndex < 0 || selectedDateIndex >= availableDates.length - 1;
}

async function init() {
  applyI18n();
  const [manifest, pool] = await Promise.all([fetchJson('guess/index.json'), fetchJson('data/guess-players.json', { revalidate: true })]);
  players = (pool || []).map(p => ({ ...p, n: normalize(p.nick), nm: normalize(p.name) }));
  playerById = new Map(players.map(p => [p.id, p]));

  if (PREVIEW) {
    availableDates = [PREVIEW];
    loadDate(PREVIEW);
    return;
  }
  const today = todayKey();
  const rawDates = (manifest?.days || []).map(d => d.date).sort();
  availableDates = rawDates.filter(d => d <= today);
  const lastDate = availableDates[availableDates.length - 1];
  nextBoardDate = rawDates.find(d => d > today) || (lastDate ? addDays(lastDate, 1) : '');
  startCountdown();
  if (!availableDates.length || !players.length) {
    $('noPuzzleScreen').classList.remove('hidden');
    updateNavButtons();
    return;
  }
  loadDate(lastDate);
}

async function loadDate(date) {
  const seq = ++loadSeq;
  selectedDate = date;
  selectedDateIndex = availableDates.indexOf(date);
  updateNavButtons();
  $('dateDisplay').textContent = formatDate(date);
  $('resultOverlay').classList.add('hidden');
  const d = await fetchJson(`guess/${date}.json`);
  if (seq !== loadSeq) return;
  if (!d || !playerById.has(d.playerId)) {
    day = answer = null;
    $('gameArea').classList.add('hidden');
    $('noPuzzleScreen').classList.remove('hidden');
    return;
  }
  $('noPuzzleScreen').classList.add('hidden');
  day = d;
  answer = playerById.get(d.playerId);
  state = loadState(date) || newState();
  state.guesses = state.guesses.filter(id => playerById.has(id)); // players can leave the pool on a data refresh
  if (PREVIEW && previewParams.has('solved')) state.gameOver = true;
  justAdded = '';
  $('gameArea').classList.remove('hidden');
  clearSearch();
  render();
}

function answerCard(target) {
  target.innerHTML = '';
  target.appendChild(avatar(answer.id, answer.nick));
  const text = el('div', 'gp-answer-text');
  text.appendChild(el('div', 'gp-answer-label', esc(t('answerWas'))));
  text.appendChild(el('div', 'gp-answer-nick', esc(answer.nick)));
  if (answer.name) text.appendChild(el('div', 'gp-answer-name', esc(answer.name)));
  target.appendChild(text);
}

function render() {
  $('guessesLeft').textContent = state.guesses.length;
  $('guessSearch').classList.toggle('hidden', state.gameOver);
  $('answerCard').classList.toggle('hidden', !state.gameOver);
  if (state.gameOver) answerCard($('answerCard'));
  const rows = $('guessRows');
  rows.innerHTML = '';
  // Newest guess on top, right under the search box (the first one ends up at the bottom); phones scroll the new
  // one into view under the search bar that stays at the top of the screen.
  // After giving up, the answer's own row goes on top so its categories can be compared with the guesses.
  if (state.gameOver && !state.won) rows.appendChild(guessRow(answer, justAdded === answer.id, ' gp-revealed'));
  [...state.guesses].reverse().forEach(id => rows.appendChild(guessRow(playerById.get(id), id === justAdded)));
  if (justAdded && narrowScreen.matches) rows.firstElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  justAdded = '';
  fitAll();
  $('btnGiveUp').classList.toggle('hidden', state.gameOver);
  $('btnShowResults').classList.toggle('hidden', !state.gameOver);
}

/* ---------- Search ---------- */

function search(query) {
  const q = normalize(query);
  if (!q) return [];
  const ranked = [];
  for (const p of players) {
    let rank = -1;
    if (p.n === q) rank = 0;
    else if (p.n.startsWith(q)) rank = 1;
    else if (p.n.includes(q)) rank = 2;
    else if (p.nm.includes(q)) rank = 3;
    if (rank >= 0) ranked.push([rank, p]);
  }
  ranked.sort((a, b) => a[0] - b[0] || b[1].intl - a[1].intl || a[1].nick.localeCompare(b[1].nick));
  return ranked.slice(0, MAX_RESULTS).map(x => x[1]);
}

function renderResults(query) {
  const list = $('searchResults');
  list.innerHTML = '';
  resultItems = search(query);
  activeResult = -1;
  const used = new Set(state.guesses);
  if (query.trim() && !resultItems.length) list.appendChild(el('li', 'result-item disabled gp-noresults', esc(t('noResults'))));
  resultItems.forEach((p, idx) => {
    const disabled = used.has(p.id);
    const li = el('li', 'result-item' + (disabled ? ' disabled' : ''));
    li.id = 'res-' + idx;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-disabled', String(disabled));
    li.appendChild(avatar(p.id, p.nick));
    const text = el('div', 'result-text');
    text.appendChild(el('div', 'result-nick', esc(p.nick)));
    if (p.name) text.appendChild(el('div', 'result-name', esc(p.name)));
    li.appendChild(text);
    if (disabled) li.appendChild(el('span', 'result-tag', esc(t('used'))));
    li.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the input
    li.addEventListener('click', () => { if (!disabled) guess(p.id); });
    list.appendChild(li);
  });
  $('searchInput').setAttribute('aria-expanded', String(list.children.length > 0));
}

function clearSearch() {
  $('searchInput').value = '';
  renderResults('');
}

function moveActive(delta) {
  if (!resultItems.length) return;
  const items = $('searchResults').children;
  if (activeResult >= 0) items[activeResult].classList.remove('active');
  activeResult = (activeResult + delta + resultItems.length) % resultItems.length;
  items[activeResult].classList.add('active');
  items[activeResult].scrollIntoView({ block: 'nearest' });
  $('searchInput').setAttribute('aria-activedescendant', items[activeResult].id);
}

function guess(id) {
  if (state.gameOver || state.guesses.includes(id)) return;
  state.guesses.push(id);
  justAdded = id;
  if (id === answer.id) state.won = true;
  if (state.won) state.gameOver = true;
  saveState();
  clearSearch();
  render();
  if (state.gameOver) setTimeout(showResult, 900); // after the row's reveal animation
  else $('searchInput').focus();
}

/* ---------- Results ---------- */


/** Emoji rows of the guesses; long games keep the first and last SHOWN_ROWS (`… +n …` between). */
const SHOWN_ROWS = 3;
function emojiRows() {
  const rows = state.guesses.map(id => {
    const c = compare(playerById.get(id));
    return [c.nat, c.role, c.league, c.team, c.titles, c.debut].map(x => (x.ok === 'part' ? '🟨' : x.ok ? '🟩' : '🟥')).join('') + (c.together ? '🤝' : '');
  });
  if (rows.length <= SHOWN_ROWS * 2 + 1) return rows.join('\n');
  return [...rows.slice(0, SHOWN_ROWS), t('moreRows', { n: rows.length - SHOWN_ROWS * 2 }), ...rows.slice(-SHOWN_ROWS)].join('\n');
}

function buildShareText() {
  return `⚔ LoL Connect · Guess the Pro #${day.number} — ${state.won ? '🎯 ' + state.guesses.length : '🏳️'}\n\n${emojiRows()}\n\n${SITE.url(currentLang, 'guess')}`;
}

function showResult() {
  $('resultTitle').textContent = state.won ? t('winTitle') : t('loseTitle');
  answerCard($('resultPlayer'));
  $('resultScore').textContent = `${t('guessesLabel')} ${state.guesses.length}`;
  $('emojiGrid').innerHTML = emojiRows().replace(/\n/g, '<br>');
  $('resultOverlay').classList.remove('hidden');
}

function canNativeShare() { return typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches; }
const shareOnX = text => window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
function shareResult(text) {
  if (!canNativeShare()) return shareOnX(text);
  navigator.share({ text }).catch(err => { if (err.name !== 'AbortError') shareOnX(text); });
}

let toastTimer = 0;
function showToast(msg) {
  const e = $('toast');
  e.textContent = msg;
  e.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => e.classList.remove('show'), 2200);
}

/* ---------- Events ---------- */

$('searchInput').addEventListener('input', e => renderResults(e.target.value));
$('searchInput').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const idx = activeResult >= 0 ? activeResult : resultItems.findIndex(p => !state.guesses.includes(p.id));
    if (idx >= 0 && !state.guesses.includes(resultItems[idx].id)) guess(resultItems[idx].id);
  } else if (e.key === 'Escape') clearSearch();
});
// The list closes when focus leaves the box (a tap elsewhere) and comes back with the text on refocus.
$('searchInput').addEventListener('blur', () => { $('searchResults').innerHTML = ''; $('searchInput').setAttribute('aria-expanded', 'false'); });
$('searchInput').addEventListener('focus', e => renderResults(e.target.value));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.overlay:not(.hidden)').forEach(o => o.classList.add('hidden'));
});
$('btnGiveUp').addEventListener('click', () => $('giveUpOverlay').classList.remove('hidden'));
$('btnGiveUpCancel').addEventListener('click', () => $('giveUpOverlay').classList.add('hidden'));
$('btnGiveUpConfirm').addEventListener('click', () => {
  $('giveUpOverlay').classList.add('hidden');
  state.gameOver = true;
  saveState();
  justAdded = answer.id; // the revealed answer row flips in
  render();
  setTimeout(showResult, 900);
});
$('btnShowResults').addEventListener('click', showResult);
$('btnGuide').addEventListener('click', () => $('guideOverlay').classList.remove('hidden'));
$('btnShare').addEventListener('click', () => shareResult(buildShareText()));
$('btnCopy').addEventListener('click', () => navigator.clipboard.writeText(buildShareText()).then(() => showToast(t('copied'))));
$('btnPrevDate').addEventListener('click', () => { if (selectedDateIndex > 0) loadDate(availableDates[selectedDateIndex - 1]); });
$('btnNextDate').addEventListener('click', () => { if (selectedDateIndex < availableDates.length - 1) loadDate(availableDates[selectedDateIndex + 1]); });
$('langSelect').addEventListener('change', e => {
  if (SITE.built || !LANGS.includes(e.target.value)) return; // built pages: footer.js opens the other language's URL
  currentLang = e.target.value;
  try { localStorage.setItem('lolc_lang', currentLang); } catch { /* storage blocked */ }
  applyI18n();
  if (day) render();
});
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.close).classList.add('hidden')));
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); }));

init();
