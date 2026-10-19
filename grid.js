/* ==========================================================================
   LoL Grid 3x3 — Game Logic
   ========================================================================== */

/** @typedef {import('./types/puzzle').GridBoard} GridBoard */
/** @typedef {import('./types/puzzle').Condition} Condition */
/** @typedef {import('./types/puzzle').PlayerIndexEntry} PlayerIndexEntry */

const LANGS = ['pl', 'en', 'es', 'fr'];
const LOCALE_MAP = { pl: 'pl-PL', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
const MAX_GUESSES = 9;
const MAX_RESULTS = 50;

const I18N = {
  pl: {
    // Same site subtitle as Connections (app.js) — it names the site, not the game.
    subtitle: 'codzienna zagadka League of Legends',
    noPuzzleTitle: '📅 Brak siatki na dziś', noPuzzleText: 'Wróć jutro po nową siatkę!',
    guessesLabel: 'Pozostałe próby:', giveUp: 'Poddaj się', results: 'Wyniki',
    searchPh: 'Wpisz nick lub imię gracza…', searchTitle: 'Wybierz gracza',
    noResults: 'Brak graczy o takim nicku.', typeMore: 'Zacznij pisać, aby wyszukać gracza.',
    used: 'już użyty', wrong: '{nick} nie spełnia obu warunków.', correct: 'Trafione!', finished: 'Koniec gry — kliknij „Wyniki”.',
    winTitle: '🏆 Perfekcyjna siatka!', doneTitle: '⚔ Koniec gry', score: '{n}/9',
    share: '𝕏 Udostępnij wynik', copy: '📋 Kopiuj wynik', copied: 'Skopiowano!',
    answers: '{n} odp.', guideTitle: '📖 Jak grać', btnGuideLabel: 'Poradnik',
    guide: [
      ['Cel', 'Wypełnij siatkę 3×3. W każdym polu wskaż pro-gracza, który spełnia warunek z wiersza <strong>i</strong> kolumny.'],
      ['Jak grać', 'Kliknij <strong>+</strong>, wyszukaj gracza po nicku lub imieniu i wybierz go z listy. Masz 9 prób — błędna odpowiedź też zużywa próbę. Każdego gracza możesz użyć tylko raz.'],
      ['Warunki', '🏳️ logo ligi lub drużyny — grał w tej lidze / drużynie (dawne nazwy drużyn się liczą) · 📣 gwizdek — był trenerem (liczą się też trenerzy, którzy nigdy nie grali) · 🩴 kapcie i gazeta — zakończył karierę · 🏆 trofeum — wygrał Worlds, MSI lub First Stand (jako zawodnik lub trener) · 🚩 flaga — narodowość gracza · 🤝 twarz gracza — był w jednej drużynie z tym graczem (jako zawodnik lub jego trener).'],
      ['Nowa siatka', 'Codziennie o 00:00 UTC. Każda siatka ma co najmniej jedno poprawne rozwiązanie.']
    ],
    cond: {
      coach: 'Trener', coachLong: 'Był trenerem',
      retired: 'Emeryt', retiredLong: 'Zakończył karierę',
      worlds: 'Mistrz Worlds', msi: 'Mistrz MSI', 'first-stand': 'Mistrz First Stand',
      league: 'Grał w {id}', team: 'Grał w {label}', alsoAs: 'też jako', teammate: 'W drużynie z {label}', nationality: 'Narodowość: {name}'
    }
  },
  en: {
    subtitle: 'daily League of Legends puzzle',
    noPuzzleTitle: '📅 No grid today', noPuzzleText: 'Come back tomorrow for a new grid!',
    guessesLabel: 'Guesses left:', giveUp: 'Give up', results: 'Results',
    searchPh: 'Type a nickname or real name…', searchTitle: 'Pick a player',
    noResults: 'No player matches.', typeMore: 'Start typing to search for a player.',
    used: 'already used', wrong: '{nick} does not meet both conditions.', correct: 'Correct!', finished: 'Game over — press “Results”.',
    winTitle: '🏆 Immaculate grid!', doneTitle: '⚔ Game over', score: '{n}/9',
    share: '𝕏 Share result', copy: '📋 Copy result', copied: 'Copied!',
    answers: '{n} ans.', guideTitle: '📖 How to play', btnGuideLabel: 'Guide',
    guide: [
      ['Goal', 'Fill the 3×3 grid. For each cell, name a pro player who meets the row condition <strong>and</strong> the column condition.'],
      ['How to play', 'Click <strong>+</strong>, search by nickname or real name and pick from the list. You have 9 guesses — wrong answers use one too. Each player can be used once.'],
      ['Conditions', '🏳️ league or team logo — played in that league / for that team (former team names count) · 📣 whistle — worked as a coach (coaches who never played count too) · 🩴 slippers & newspaper — retired · 🏆 trophy — won Worlds, MSI or First Stand (as a player or coach) · 🚩 flag — the player\'s nationality · 🤝 player face — was on a team with that player (as a teammate or as their coach).'],
      ['New grid', 'Every day at 00:00 UTC. Every grid has at least one valid solution.']
    ],
    cond: {
      coach: 'Coach', coachLong: 'Worked as a coach',
      retired: 'Retired', retiredLong: 'Retired from pro play',
      worlds: 'Worlds winner', msi: 'MSI winner', 'first-stand': 'First Stand winner',
      league: 'Played in {id}', team: 'Played for {label}', alsoAs: 'incl.', teammate: 'Teammate of {label}', nationality: 'Nationality: {name}'
    }
  },
  es: {
    subtitle: 'acertijo diario de League of Legends',
    noPuzzleTitle: '📅 No hay cuadrícula hoy', noPuzzleText: '¡Vuelve mañana por una nueva!',
    guessesLabel: 'Intentos restantes:', giveUp: 'Rendirse', results: 'Resultados',
    searchPh: 'Escribe un nick o nombre…', searchTitle: 'Elige un jugador',
    noResults: 'Ningún jugador coincide.', typeMore: 'Empieza a escribir para buscar.',
    used: 'ya usado', wrong: '{nick} no cumple ambas condiciones.', correct: '¡Correcto!', finished: 'Fin del juego — pulsa «Resultados».',
    winTitle: '🏆 ¡Cuadrícula perfecta!', doneTitle: '⚔ Fin del juego', score: '{n}/9',
    share: '𝕏 Compartir resultado', copy: '📋 Copiar resultado', copied: '¡Copiado!',
    answers: '{n} resp.', guideTitle: '📖 Cómo jugar', btnGuideLabel: 'Guía',
    guide: [
      ['Objetivo', 'Completa la cuadrícula 3×3. En cada casilla, elige un jugador pro que cumpla la condición de la fila <strong>y</strong> de la columna.'],
      ['Cómo jugar', 'Pulsa <strong>+</strong>, busca por nick o nombre real y elige de la lista. Tienes 9 intentos — los fallos también cuentan. Cada jugador solo se puede usar una vez.'],
      ['Condiciones', '🏳️ logo de liga o equipo — jugó en esa liga / equipo (cuentan nombres antiguos) · 📣 silbato — fue entrenador (también cuentan los que nunca jugaron) · 🩴 zapatillas y periódico — retirado · 🏆 trofeo — ganó Worlds, MSI o First Stand (como jugador o entrenador) · 🚩 bandera — nacionalidad del jugador · 🤝 cara de jugador — estuvo en un equipo con ese jugador (como compañero o como su entrenador).'],
      ['Nueva cuadrícula', 'Cada día a las 00:00 UTC. Cada cuadrícula tiene al menos una solución.']
    ],
    cond: {
      coach: 'Entrenador', coachLong: 'Fue entrenador',
      retired: 'Retirado', retiredLong: 'Se retiró',
      worlds: 'Campeón de Worlds', msi: 'Campeón del MSI', 'first-stand': 'Campeón de First Stand',
      league: 'Jugó en {id}', team: 'Jugó en {label}', alsoAs: 'incl.', teammate: 'Compañero de {label}', nationality: 'Nacionalidad: {name}'
    }
  },
  fr: {
    subtitle: 'énigme quotidienne de League of Legends',
    noPuzzleTitle: '📅 Pas de grille aujourd\'hui', noPuzzleText: 'Revenez demain pour une nouvelle grille !',
    guessesLabel: 'Essais restants :', giveUp: 'Abandonner', results: 'Résultats',
    searchPh: 'Tapez un pseudo ou un nom…', searchTitle: 'Choisissez un joueur',
    noResults: 'Aucun joueur trouvé.', typeMore: 'Commencez à taper pour chercher.',
    used: 'déjà utilisé', wrong: '{nick} ne remplit pas les deux conditions.', correct: 'Correct !', finished: 'Partie terminée — cliquez sur « Résultats ».',
    winTitle: '🏆 Grille parfaite !', doneTitle: '⚔ Partie terminée', score: '{n}/9',
    share: '𝕏 Partager le résultat', copy: '📋 Copier le résultat', copied: 'Copié !',
    answers: '{n} rép.', guideTitle: '📖 Comment jouer', btnGuideLabel: 'Guide',
    guide: [
      ['Objectif', 'Remplissez la grille 3×3. Pour chaque case, trouvez un joueur pro qui remplit la condition de la ligne <strong>et</strong> de la colonne.'],
      ['Comment jouer', 'Cliquez sur <strong>+</strong>, cherchez par pseudo ou nom et choisissez dans la liste. Vous avez 9 essais — les erreurs comptent aussi. Chaque joueur ne peut être utilisé qu\'une fois.'],
      ['Conditions', '🏳️ logo de ligue ou d\'équipe — a joué dans cette ligue / équipe (anciens noms inclus) · 📣 sifflet — a été coach (y compris ceux qui n\'ont jamais joué) · 🩴 chaussons et journal — retraité · 🏆 trophée — a gagné les Worlds, le MSI ou First Stand (comme joueur ou coach) · 🚩 drapeau — nationalité du joueur · 🤝 visage — a été dans une équipe avec ce joueur (comme coéquipier ou comme son coach).'],
      ['Nouvelle grille', 'Chaque jour à 00:00 UTC. Chaque grille a au moins une solution.']
    ],
    cond: {
      coach: 'Coach', coachLong: 'A été coach',
      retired: 'Retraité', retiredLong: 'A pris sa retraite',
      worlds: 'Champion des Worlds', msi: 'Champion du MSI', 'first-stand': 'Champion de First Stand',
      league: 'A joué en {id}', team: 'A joué pour {label}', alsoAs: 'y compris', teammate: 'Coéquipier de {label}', nationality: 'Nationalité : {name}'
    }
  }
};

// Helpers
const $ = id => document.getElementById(id);
let currentLang = 'en';
try { if (LANGS.includes(localStorage.getItem('lolc_lang'))) currentLang = localStorage.getItem('lolc_lang'); } catch { /* storage blocked */ }

const fill = (s, vars) => Object.keys(vars || {}).reduce((acc, k) => acc.replace(`{${k}}`, vars[k]), s);
const t = (key, vars) => fill((I18N[currentLang] && I18N[currentLang][key]) ?? I18N.en[key] ?? key, vars);
const tc = (key, vars) => fill(I18N[currentLang].cond[key] ?? I18N.en.cond[key] ?? key, vars);
const esc = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const normalize = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9가-힣一-龥]/g, '');
const todayKey = () => new Date().toISOString().slice(0, 10);

// State
let availableDates = [], selectedDate = '', selectedDateIndex = -1;
/** @type {GridBoard | null} */
let board = null;
let state = null;
/** @type {(PlayerIndexEntry & { n: string, nm: string })[]} */
let players = [];
/** @type {Map<string, PlayerIndexEntry>} */
let playerById = new Map();
const boardCache = new Map();
let loadSeq = 0;
let activeCell = -1, activeResult = -1, resultItems = [];

const stateKey = date => `lolg_state_${date}`;
const loadState = date => { try { return JSON.parse(localStorage.getItem(stateKey(date))); } catch { return null; } };
const saveState = () => { try { localStorage.setItem(stateKey(selectedDate), JSON.stringify(state)); } catch { /* storage blocked */ } };
const newState = () => ({ cells: Array(9).fill(null), guessesLeft: MAX_GUESSES, wrong: [], gameOver: false });

async function fetchJson(url) {
  try {
    const res = await fetch(url + '?_=' + Date.now());
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.warn('Nie udało się pobrać ' + url, e);
    return null;
  }
}

function fetchBoard(date) {
  if (!boardCache.has(date)) {
    const p = fetchJson(`grid/${date}.json`).then(b => (b?.rows?.length === 3 && b?.cols?.length === 3 ? b : null));
    boardCache.set(date, p);
    p.then(b => { if (!b) boardCache.delete(date); });
  }
  return boardCache.get(date);
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

/** Image with a text emblem fallback (used for league/team logos that may not be downloaded). */
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
  img.addEventListener('error', () => img.replaceWith(emblem()), { once: true });
  return img;
}

/** Country name in the current language, from an ISO alpha-2 code. */
function countryName(code) {
  try { return new Intl.DisplayNames([currentLang], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase(); }
  catch { return code.toUpperCase(); }
}

function conditionText(c) {
  switch (c.kind) {
    case 'league': return { short: c.id, long: tc('league', { id: c.id }) };
    case 'team': return {
      short: c.short || c.label,
      long: tc('team', { label: c.label }) + (c.aliases?.length ? ` (${tc('alsoAs')} ${c.aliases.join(', ')})` : '')
    };
    case 'coach': return { short: tc('coach'), long: tc('coachLong') };
    case 'retired': return { short: tc('retired'), long: tc('retiredLong') };
    case 'trophy': return { short: tc(c.id), long: tc(c.id) };
    case 'nationality': return { short: countryName(c.id), long: tc('nationality', { name: countryName(c.id) }) };
    case 'teammate': return { short: c.label, long: tc('teammate', { label: c.label }) };
    default: return { short: '?', long: '?' };
  }
}

/** Graphical badge for one axis condition. */
function conditionBadge(c, small = false) {
  const { short, long } = conditionText(c);
  const wrap = el('div', `cond cond-${c.kind}` + (small ? ' small' : ''));
  wrap.title = long;
  const icon = el('div', 'cond-icon');
  switch (c.kind) {
    case 'league':
      // Drop an official logo at assets/logos/leagues/{ID}.webp to replace the emblem.
      icon.appendChild(logo(`assets/logos/leagues/${c.id}.webp`, 'emblem-league', c.id, { 'data-league': c.id }));
      break;
    case 'team':
      icon.appendChild(logo(`assets/logos/teams/${encodeURIComponent(c.id)}.webp`, 'emblem-team', c.short || c.label));
      break;
    case 'coach':
    case 'retired':
      icon.appendChild(logo(`assets/badges/${c.kind}.svg`, 'emblem-team', short));
      break;
    case 'trophy':
      icon.appendChild(logo(`assets/badges/${c.id}.svg`, 'emblem-team', short));
      break;
    case 'nationality':
      icon.appendChild(logo(`assets/flags/${encodeURIComponent(c.id)}.svg`, 'emblem-team', c.id.toUpperCase()));
      break;
    case 'teammate':
      icon.appendChild(avatar(c.playerId, c.label));
      icon.appendChild(el('span', 'handshake', '🤝'));
      break;
  }
  wrap.appendChild(icon);
  const caption = el('div', 'cond-caption');
  caption.textContent = short;
  wrap.appendChild(caption);
  return wrap;
}

/* ---------- Game ---------- */

function applyI18n() {
  document.documentElement.lang = currentLang;
  const map = {
    subtitle: 'subtitle', noPuzzleTitle: 'noPuzzleTitle', noPuzzleText: 'noPuzzleText',
    guessesLabel: 'guessesLabel', btnGiveUp: 'giveUp', btnShowResults: 'results',
    btnShare: 'share', btnCopy: 'copy', guideTitle: 'guideTitle', btnGuideLabel: 'btnGuideLabel', searchTitle: 'searchTitle'
  };
  Object.entries(map).forEach(([id, k]) => { if ($(id)) $(id).textContent = t(k); });
  $('searchInput').placeholder = t('searchPh');
  $('langSelect').value = currentLang;
  $('dateDisplay').textContent = selectedDate ? formatDate(selectedDate) : '';
  $('guideContent').innerHTML = t('guide').map(([h, p]) => `<div class="guide-section"><h3>${h}</h3><p>${p}</p></div>`).join('');
}

const formatDate = d => new Date(d + 'T00:00:00').toLocaleDateString(LOCALE_MAP[currentLang], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function updateNavButtons() {
  $('btnPrevDate').disabled = selectedDateIndex <= 0;
  $('btnNextDate').disabled = selectedDateIndex < 0 || selectedDateIndex >= availableDates.length - 1;
}

async function init() {
  applyI18n();
  const [manifest, index] = await Promise.all([fetchJson('grid/index.json'), fetchJson('data/players-index.json')]);
  players = (index || []).map(p => ({ ...p, n: normalize(p.nick), nm: normalize(p.name) }));
  playerById = new Map(players.map(p => [p.id, p]));

  const today = todayKey();
  const dates = (manifest?.boards || []).map(b => b.date).sort().filter(d => d <= today);
  if (!dates.includes(today) && await fetchBoard(today)) dates.push(today);
  availableDates = dates;
  if (!dates.length) {
    $('noPuzzleScreen').classList.remove('hidden');
    updateNavButtons();
    return;
  }
  loadDate(dates.includes(today) ? today : dates[dates.length - 1]);
}

async function loadDate(date) {
  const seq = ++loadSeq;
  selectedDate = date;
  selectedDateIndex = availableDates.indexOf(date);
  updateNavButtons();
  $('dateDisplay').textContent = formatDate(date);
  ['noPuzzleScreen', 'gameArea', 'resultOverlay', 'searchOverlay'].forEach(id => $(id).classList.add('hidden'));

  const b = await fetchBoard(date);
  if (seq !== loadSeq) return;
  if (!b) { board = null; $('noPuzzleScreen').classList.remove('hidden'); return; }
  board = b;
  state = loadState(date) || newState();
  $('gameArea').classList.remove('hidden');
  // A finished board shows the revealed grid and the "Results" button; the popup only appears when the game ends.
  render();
}

const cellAnswers = i => board.answers[Math.floor(i / 3)][i % 3];
const nickOf = id => playerById.get(id)?.nick || id;

/**
 * Players to reveal in empty cells after the game: a full solution with 9 different players that keeps the
 * player's own picks (same augmenting-path matching the generator uses to guarantee solvability).
 */
function revealSolution() {
  const owner = new Map(); // player id → cell
  state.cells.forEach((id, i) => { if (id) owner.set(id, i); });
  const tryCell = (i, seen) => {
    for (const id of cellAnswers(i)) {
      if (seen.has(id) || state.cells.includes(id)) continue;
      seen.add(id);
      if (!owner.has(id) || tryCell(owner.get(id), seen)) { owner.set(id, i); return true; }
    }
    return false;
  };
  state.cells.forEach((id, i) => { if (!id) tryCell(i, new Set()); });
  const byCell = new Map([...owner].map(([id, i]) => [i, id]));
  return state.cells.map((id, i) => id || byCell.get(i) || cellAnswers(i)[0]);
}

function render() {
  $('guessesLeft').textContent = state.guessesLeft;
  const grid = $('lolGrid');
  grid.innerHTML = '';
  const corner = el('div', 'lolgrid-corner');
  corner.appendChild(Object.assign(el('img'), { src: 'icon.svg', alt: '' }));
  grid.appendChild(corner);
  board.cols.forEach(c => { const a = el('div', 'axis axis-col'); a.appendChild(conditionBadge(c)); grid.appendChild(a); });

  const revealed = state.gameOver ? revealSolution() : null;
  board.rows.forEach((rowCond, r) => {
    const a = el('div', 'axis axis-row');
    a.appendChild(conditionBadge(rowCond));
    grid.appendChild(a);
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const id = state.cells[i];
      const label = `${conditionText(rowCond).long} × ${conditionText(board.cols[c]).long}`;
      if (id || state.gameOver) {
        const shown = id || revealed[i];
        const cell = el('div', 'cell' + (id ? ' filled' : ' revealed'));
        cell.title = label;
        const inner = el('div', 'cell-player');
        inner.appendChild(avatar(shown, nickOf(shown)));
        const nick = el('div', 'cell-player-nick');
        nick.textContent = nickOf(shown);
        inner.appendChild(nick);
        cell.appendChild(inner);
        if (state.gameOver) cell.appendChild(el('span', 'cell-count', esc(t('answers', { n: cellAnswers(i).length }))));
        grid.appendChild(cell);
      } else {
        const cell = el('button', 'cell');
        cell.type = 'button';
        cell.setAttribute('aria-label', label);
        cell.appendChild(el('span', 'cell-plus', '+'));
        cell.addEventListener('click', () => openSearch(i));
        grid.appendChild(cell);
      }
    }
  });

  $('btnGiveUp').classList.toggle('hidden', state.gameOver);
  $('btnShowResults').classList.toggle('hidden', !state.gameOver);
}

/* ---------- Search modal ---------- */

function openSearch(i) {
  if (state.gameOver) return;
  activeCell = i;
  const conds = $('searchConds');
  conds.innerHTML = '';
  conds.appendChild(conditionBadge(board.rows[Math.floor(i / 3)], true));
  conds.appendChild(el('span', 'times', '×'));
  conds.appendChild(conditionBadge(board.cols[i % 3], true));
  $('searchInput').value = '';
  setSearchMsg(t('typeMore'));
  renderResults('');
  $('searchOverlay').classList.remove('hidden');
  $('searchInput').focus();
}

function closeSearch() {
  $('searchOverlay').classList.add('hidden');
  activeCell = -1;
}

function setSearchMsg(msg, bad = false) {
  $('searchMsg').textContent = msg;
  $('searchMsg').classList.toggle('bad', bad);
}

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
  // Within a match tier, better-known players (more tournaments played) come first.
  ranked.sort((a, b) => a[0] - b[0] || (b[1].t || 0) - (a[1].t || 0) || a[1].nick.localeCompare(b[1].nick));
  return ranked.slice(0, MAX_RESULTS).map(x => x[1]);
}

function renderResults(query) {
  const list = $('searchResults');
  list.innerHTML = '';
  resultItems = search(query);
  activeResult = -1;
  const used = new Set(state.cells.filter(Boolean));
  const wrongHere = new Set(state.wrong.filter(w => w.cell === activeCell).map(w => w.id));

  resultItems.forEach((p, idx) => {
    const disabled = used.has(p.id) || wrongHere.has(p.id);
    const li = el('li', 'result-item' + (disabled ? ' disabled' : ''));
    li.id = 'res-' + idx;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-disabled', String(disabled));
    li.appendChild(avatar(p.id, p.nick));
    const text = el('div', 'result-text');
    text.appendChild(el('div', 'result-nick', esc(p.nick)));
    if (p.name) text.appendChild(el('div', 'result-name', esc(p.name)));
    li.appendChild(text);
    if (used.has(p.id)) li.appendChild(el('span', 'result-tag', esc(t('used'))));
    else if (wrongHere.has(p.id)) li.appendChild(el('span', 'result-tag', '✗'));
    li.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the input
    li.addEventListener('click', () => { if (!disabled) guess(p.id); });
    list.appendChild(li);
  });
  if (query.trim()) setSearchMsg(resultItems.length ? '' : t('noResults'));
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
  if (activeCell < 0 || state.gameOver || state.guessesLeft <= 0) return;
  if (state.cells.includes(id)) return;
  const cell = activeCell;
  state.guessesLeft--;
  const ok = cellAnswers(cell).includes(id);
  if (ok) state.cells[cell] = id;
  else state.wrong.push({ cell, id });
  if (state.guessesLeft <= 0 || state.cells.every(Boolean)) state.gameOver = true;
  saveState();
  render();

  if (ok || state.gameOver) {
    closeSearch();
    // The results popup opens only from the "Results" button; the end of the game is announced with a toast.
    showToast(state.gameOver ? t('finished') : t('correct'));
    return;
  }
  const modal = document.querySelector('.search-modal');
  modal.classList.remove('shake');
  void modal.offsetWidth;
  modal.classList.add('shake');
  renderResults($('searchInput').value);
  setSearchMsg(t('wrong', { nick: nickOf(id) }), true);
}

/* ---------- Results ---------- */

const score = () => state.cells.filter(Boolean).length;
const emojiGrid = () => [0, 1, 2].map(r => [0, 1, 2].map(c => (state.cells[r * 3 + c] ? '🟩' : '⬜')).join('')).join('\n');

function buildShareText() {
  return `⚔ LoL Grid #${board.boardId} — ${score()}/9\n\n${emojiGrid()}\n\nhttps://connect4.lol/`;
}

function showResult() {
  $('resultTitle').textContent = score() === 9 ? t('winTitle') : t('doneTitle');
  $('resultScore').textContent = t('score', { n: score() });
  $('emojiGrid').innerHTML = emojiGrid().replace(/\n/g, '<br>');
  $('resultOverlay').classList.remove('hidden');
}

function showToast(msg) {
  const e = $('toast');
  e.textContent = msg;
  e.classList.add('show');
  setTimeout(() => e.classList.remove('show'), 2200);
}

/* ---------- Events ---------- */

$('searchInput').addEventListener('input', e => renderResults(e.target.value));
$('searchInput').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const idx = activeResult >= 0 ? activeResult : 0;
    const item = $('searchResults').children[idx];
    if (item && item.getAttribute('aria-disabled') !== 'true') guess(resultItems[idx].id);
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.overlay:not(.hidden)').forEach(o => o.classList.add('hidden'));
  activeCell = -1;
});
$('btnGiveUp').addEventListener('click', () => {
  state.gameOver = true;
  saveState();
  render();
  showToast(t('finished'));
});
$('btnShowResults').addEventListener('click', showResult);
$('btnGuide').addEventListener('click', () => $('guideOverlay').classList.remove('hidden'));
$('btnShare').addEventListener('click', () => window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(buildShareText()), '_blank'));
$('btnCopy').addEventListener('click', () => navigator.clipboard.writeText(buildShareText()).then(() => showToast(t('copied'))));
$('btnPrevDate').addEventListener('click', () => { if (selectedDateIndex > 0) loadDate(availableDates[selectedDateIndex - 1]); });
$('btnNextDate').addEventListener('click', () => { if (selectedDateIndex < availableDates.length - 1) loadDate(availableDates[selectedDateIndex + 1]); });
$('langSelect').addEventListener('change', e => {
  if (!LANGS.includes(e.target.value)) return;
  currentLang = e.target.value;
  try { localStorage.setItem('lolc_lang', currentLang); } catch { /* storage blocked */ }
  applyI18n();
  if (board) render();
});
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => {
  $(btn.dataset.close).classList.add('hidden');
  if (btn.dataset.close === 'searchOverlay') activeCell = -1;
}));
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => {
  if (e.target !== o) return;
  o.classList.add('hidden');
  if (o.id === 'searchOverlay') activeCell = -1;
}));

init();
