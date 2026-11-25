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
    // Same site subtitle as Guess the Pro (guess.js) — it names the site, not the game.
    subtitle: 'Codzienna zagadka LoL esports',
    noPuzzleTitle: '📅 Brak siatki na dziś', noPuzzleText: 'Wróć jutro po nową siatkę!',
    nextBoardIn: 'Nowa siatka za', nextBoardSoon: 'Nowa siatka już wkrótce',
    guessesLabel: 'Pozostałe próby:', giveUp: 'Poddaj się', results: 'Wyniki',
    searchPh: 'Wpisz nick gracza…', searchTitle: 'Wybierz gracza',
    noResults: 'Brak graczy o takim nicku.', typeMore: 'Zacznij pisać, aby wyszukać gracza.',
    used: 'już użyty', wrong: '{nick} nie spełnia obu warunków.', correct: 'Trafione!', finished: 'Koniec gry — kliknij „Wyniki”.',
    winTitle: '🏆 Perfekcyjna siatka!', doneTitle: '⚔ Koniec gry', score: '{n}/9',
    share: '𝕏 Udostępnij wynik', shareNative: '📤 Udostępnij wynik', copy: '📋 Kopiuj wynik', copied: 'Skopiowano!',
    giveUpTitle: 'Poddać się?', giveUpText: 'Gra się zakończy, a pozostałe pola zostaną odkryte. Tego nie da się cofnąć.',
    giveUpConfirm: 'Poddaj się', giveUpCancel: 'Graj dalej',
    pathTab: 'Career Path', newLabel: 'Nowość', soonLabel: 'Wkrótce: nowy tryb', streakLabel: 'Seria',
    // The guide window (onboarding.js).
    onbNext: "Dalej", onbClose: "Zamknij", onbLang: "Język",
    onbSkip: "Pomiń",
    onbDone: "Gramy!",
    onbSteps: [["Siatka 3×3", "W każdym polu wpisz pro-gracza, który pasuje <strong>i</strong> do wiersza, <strong>i</strong> do kolumny — na przykład grał w T1 i wygrał Worlds."], ["9 prób", "Kliknij pole, wpisz nick gracza i wybierz go z listy. Błędna odpowiedź też zużywa próbę, a każdej osoby użyjesz tylko raz. Trenerzy też się liczą."]],
    answers: '{n} odp.', btnGuideLabel: 'Poradnik',
    cond: {
      coach: 'Trener', coachLong: 'Był trenerem',
      retired: 'Emerytowany gracz', retiredLong: 'Zakończył karierę zawodniczą',
      worlds: 'Mistrz Worlds', msi: 'Mistrz MSI', 'first-stand': 'Mistrz First Stand',
      league: 'Grał lub trenował w {id}', team: 'Grał lub trenował w {label}', aka: 'Znana również jako', teammate: 'Był w drużynie z {label}', nationality: 'Narodowość: {name}'
    }
  },
  en: {
    subtitle: 'Daily LoL esports puzzle',
    noPuzzleTitle: '📅 No grid today', noPuzzleText: 'Come back tomorrow for a new grid!',
    nextBoardIn: 'New grid in', nextBoardSoon: 'New grid coming soon',
    guessesLabel: 'Guesses left:', giveUp: 'Give up', results: 'Results',
    searchPh: 'Type a player’s nickname…', searchTitle: 'Pick a player',
    noResults: 'No player matches.', typeMore: 'Start typing to search for a player.',
    used: 'already used', wrong: '{nick} does not meet both conditions.', correct: 'Correct!', finished: 'Game over — press “Results”.',
    winTitle: '🏆 Immaculate grid!', doneTitle: '⚔ Game over', score: '{n}/9',
    share: '𝕏 Share result', shareNative: '📤 Share result', copy: '📋 Copy result', copied: 'Copied!',
    giveUpTitle: 'Give up?', giveUpText: 'The game ends and the remaining cells are revealed. This cannot be undone.',
    giveUpConfirm: 'Give up', giveUpCancel: 'Keep playing',
    pathTab: 'Career Path', newLabel: 'New', soonLabel: 'Coming soon: a new mode', streakLabel: 'Streak',
    // The guide window (onboarding.js).
    onbNext: "Next", onbClose: "Close", onbLang: "Language",
    onbSkip: "Skip",
    onbDone: "Let's play!",
    onbSteps: [["3×3 grid", "In each cell, name a pro player who fits the row <strong>and</strong> the column — for example, played for T1 and won Worlds."], ["9 guesses", "Tap a cell, type the player’s nickname and pick them from the list. A wrong answer uses a guess too, and each person can be used once. Coaches count as well."]],
    answers: '{n} ans.', btnGuideLabel: 'Guide',
    cond: {
      coach: 'Coach', coachLong: 'Worked as a coach',
      retired: 'Retired player', retiredLong: 'Retired from playing',
      worlds: 'Worlds winner', msi: 'MSI winner', 'first-stand': 'First Stand winner',
      league: 'Played or coached in {id}', team: 'Played for or coached {label}', aka: 'Also known as', teammate: 'Was on a team with {label}', nationality: 'Nationality: {name}'
    }
  },
  es: {
    subtitle: 'Acertijo diario de LoL esports',
    noPuzzleTitle: '📅 No hay cuadrícula hoy', noPuzzleText: '¡Vuelve mañana por una nueva!',
    nextBoardIn: 'Nueva cuadrícula en', nextBoardSoon: 'Nueva cuadrícula muy pronto',
    guessesLabel: 'Intentos restantes:', giveUp: 'Rendirse', results: 'Resultados',
    searchPh: 'Escribe el nick del jugador…', searchTitle: 'Elige un jugador',
    noResults: 'Ningún jugador coincide.', typeMore: 'Empieza a escribir para buscar.',
    used: 'ya usado', wrong: '{nick} no cumple ambas condiciones.', correct: '¡Correcto!', finished: 'Fin del juego — pulsa «Resultados».',
    winTitle: '🏆 ¡Cuadrícula perfecta!', doneTitle: '⚔ Fin del juego', score: '{n}/9',
    share: '𝕏 Compartir resultado', shareNative: '📤 Compartir resultado', copy: '📋 Copiar resultado', copied: '¡Copiado!',
    giveUpTitle: '¿Rendirse?', giveUpText: 'La partida termina y se revelan las casillas restantes. No se puede deshacer.',
    giveUpConfirm: 'Rendirse', giveUpCancel: 'Seguir jugando',
    pathTab: 'Career Path', newLabel: 'Nuevo', soonLabel: 'Próximamente: un nuevo modo', streakLabel: 'Racha',
    // The guide window (onboarding.js).
    onbNext: "Siguiente", onbClose: "Cerrar", onbLang: "Idioma",
    onbSkip: "Saltar",
    onbDone: "¡A jugar!",
    onbSteps: [["Cuadrícula 3×3", "En cada casilla, escribe un jugador pro que cumpla la fila <strong>y</strong> la columna — por ejemplo, jugó en T1 y ganó Worlds."], ["9 intentos", "Toca una casilla, escribe el nick del jugador y elígelo de la lista. Un fallo también gasta un intento y cada persona se usa una sola vez. Los entrenadores también cuentan."]],
    answers: '{n} resp.', btnGuideLabel: 'Guía',
    cond: {
      coach: 'Entrenador', coachLong: 'Fue entrenador',
      retired: 'Jugador retirado', retiredLong: 'Se retiró como jugador',
      worlds: 'Campeón de Worlds', msi: 'Campeón del MSI', 'first-stand': 'Campeón de First Stand',
      league: 'Jugó o entrenó en {id}', team: 'Jugó o entrenó en {label}', aka: 'También conocido como', teammate: 'Estuvo en un equipo con {label}', nationality: 'Nacionalidad: {name}'
    }
  },
  fr: {
    subtitle: 'Énigme quotidienne LoL esports',
    noPuzzleTitle: '📅 Pas de grille aujourd\'hui', noPuzzleText: 'Revenez demain pour une nouvelle grille !',
    nextBoardIn: 'Nouvelle grille dans', nextBoardSoon: 'Nouvelle grille très bientôt',
    guessesLabel: 'Essais restants :', giveUp: 'Abandonner', results: 'Résultats',
    searchPh: 'Tapez le pseudo du joueur…', searchTitle: 'Choisissez un joueur',
    noResults: 'Aucun joueur trouvé.', typeMore: 'Commencez à taper pour chercher.',
    used: 'déjà utilisé', wrong: '{nick} ne remplit pas les deux conditions.', correct: 'Correct !', finished: 'Partie terminée — cliquez sur « Résultats ».',
    winTitle: '🏆 Grille parfaite !', doneTitle: '⚔ Partie terminée', score: '{n}/9',
    share: '𝕏 Partager le résultat', shareNative: '📤 Partager le résultat', copy: '📋 Copier le résultat', copied: 'Copié !',
    giveUpTitle: 'Abandonner ?', giveUpText: 'La partie se termine et les cases restantes sont révélées. Impossible de revenir en arrière.',
    giveUpConfirm: 'Abandonner', giveUpCancel: 'Continuer',
    pathTab: 'Career Path', newLabel: 'Nouveau', soonLabel: 'Bientôt : un nouveau mode', streakLabel: 'Série',
    // The guide window (onboarding.js).
    onbNext: "Suivant", onbClose: "Fermer", onbLang: "Langue",
    onbSkip: "Passer",
    onbDone: "On joue !",
    onbSteps: [["Grille 3×3", "Dans chaque case, trouvez un joueur pro qui remplit la ligne <strong>et</strong> la colonne — par exemple, a joué chez T1 et gagné les Worlds."], ["9 essais", "Touchez une case, tapez le pseudo du joueur et choisissez-le dans la liste. Une erreur coûte aussi un essai, et chaque personne ne sert qu’une fois. Les coachs comptent aussi."]],
    answers: '{n} rép.', btnGuideLabel: 'Guide',
    cond: {
      coach: 'Coach', coachLong: 'A été coach',
      retired: 'Joueur retraité', retiredLong: 'A pris sa retraite de joueur',
      worlds: 'Champion des Worlds', msi: 'Champion du MSI', 'first-stand': 'Champion de First Stand',
      league: 'A joué ou coaché en {id}', team: 'A joué pour ou coaché {label}', aka: 'Aussi connue sous le nom de', teammate: 'A été dans une équipe avec {label}', nationality: 'Nationalité : {name}'
    }
  }
};

// Helpers
const $ = id => document.getElementById(id);
let currentLang = SITE.lang; // site.js: the URL's language on built pages

const fill = (s, vars) => Object.keys(vars || {}).reduce((acc, k) => acc.replace(`{${k}}`, vars[k]), s);
const t = (key, vars) => fill((I18N[currentLang] && I18N[currentLang][key]) ?? I18N.en[key] ?? key, vars);
const tc = (key, vars) => fill(I18N[currentLang].cond[key] ?? I18N.en.cond[key] ?? key, vars);
const esc = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const normalize = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9가-힣一-龥]/g, '');
const todayKey = () => new Date().toISOString().slice(0, 10);

// State
let availableDates = [], selectedDate = '', selectedDateIndex = -1;
// Grids come out daily. The countdown targets the next grid in the manifest, else the last one + 1 day.
let nextBoardDate = '', countdownTimer = null;
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

// Admin preview (admin.html): ?preview=YYYY-MM-DD opens that board — future ones too — as a fresh game that is
// never saved; &solved=1 shows it finished, answers revealed. Local admin server only, so the live site
// doesn't hand out tomorrow's boards.
const previewParams = new URLSearchParams(location.search);
const PREVIEW = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname)
  && /^\d{4}-\d{2}-\d{2}$/.test(previewParams.get('preview') || '') ? previewParams.get('preview') : '';

const stateKey = date => `lolg_state_${date}`;
const loadState = date => { if (PREVIEW) return null; try { return JSON.parse(localStorage.getItem(stateKey(date))); } catch { return null; } };
const saveState = () => { if (PREVIEW) return; try { localStorage.setItem(stateKey(selectedDate), JSON.stringify(state)); } catch { /* storage blocked */ } };
const newState = () => ({ cells: Array(9).fill(null), guessesLeft: MAX_GUESSES, wrong: [], gameOver: false });

/** `revalidate`: keep the browser copy and only ask the server whether it changed (a 304 for the 150 KB player
 *  index, which changes only on deploys) instead of downloading a fresh copy on every visit. */
async function fetchJson(url, { revalidate = false } = {}) {
  try {
    const res = await (revalidate ? fetch(url, { cache: 'no-cache' }) : fetch(url + '?_=' + Date.now()));
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

/** Image shown for a condition (team/league logo, badge, flag or the teammate's portrait). */
function conditionImage(c) {
  switch (c.kind) {
    case 'league': return `assets/logos/leagues-white/${c.id}.webp`; // white trace (make-league-logos.js)
    case 'team': return `assets/logos/teams/${encodeURIComponent(c.id)}.webp`;
    case 'coach': case 'retired': return `assets/badges/${c.kind}.svg`;
    case 'trophy': return `assets/badges/${c.id}.webp`;
    case 'nationality': return `assets/flags/${encodeURIComponent(c.id)}.svg`;
    case 'teammate': return `players/${encodeURIComponent(c.playerId)}.webp`;
    default: return '';
  }
}

/** Loads images into the browser cache; settles once all are done (missing files included) or after `ms`. */
function preloadImages(urls, ms) {
  const all = Promise.all(urls.map(url => { const img = new Image(); img.src = url; return img.decode().catch(() => {}); }));
  return Promise.race([all, new Promise(r => setTimeout(r, ms))]);
}

/** A board's condition images plus the portraits already placed in it, so switching to it doesn't flicker. */
function boardImages(b, date) {
  const placed = (loadState(date)?.cells || []).filter(Boolean).map(id => `players/${encodeURIComponent(id)}.webp`);
  return [...b.rows, ...b.cols].map(conditionImage).filter(Boolean).concat(placed);
}

/** Fetches a neighbouring day's board and its images in the background. */
function prefetchBoard(date) {
  if (date) fetchBoard(date).then(b => b && preloadImages(boardImages(b, date), 10000));
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
      long: tc('team', { label: c.label })
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
  // Touch screens don't show titles: a tap shows the same text as a toast.
  wrap.addEventListener('click', () => showToast(long));
  const icon = el('div', 'cond-icon');
  switch (c.kind) {
    case 'league':
      // Drop an official logo at assets/logos/leagues/{ID}.webp (and run make-league-logos.js) to replace the emblem.
      icon.appendChild(logo(conditionImage(c), 'emblem-league', c.id, { 'data-league': c.id }));
      break;
    case 'team':
      icon.appendChild(logo(conditionImage(c), 'emblem-team', c.short || c.label));
      break;
    case 'coach':
    case 'retired':
      icon.appendChild(logo(conditionImage(c), 'emblem-team', short));
      break;
    case 'trophy':
      icon.appendChild(logo(conditionImage(c), 'emblem-team', short));
      break;
    case 'nationality':
      icon.appendChild(logo(conditionImage(c), 'emblem-team', c.id.toUpperCase()));
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
  // "i" on the board's category cards: the full condition, with a team's former names (they count too). The dot
  // stays small; its ::after gives it a 44×44 px touch area (grid.css).
  if (!small) {
    const more = c.kind === 'team' && c.aliases?.length ? `${long}. ${tc('aka')}: ${c.aliases.join(', ')}` : long;
    const info = el('button', 'cond-info', 'i');
    info.type = 'button';
    info.title = more;
    info.setAttribute('aria-label', more);
    info.addEventListener('click', e => { e.stopPropagation(); showToast(more); });
    wrap.appendChild(info);
  }
  return wrap;
}

/* ---------- Game ---------- */

function applyI18n() {
  document.documentElement.lang = currentLang;
  // The same keys are filled into the HTML at build time (scripts/build-site.js), so built pages don't change here.
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
  if (canNativeShare()) $('btnShare').textContent = t('shareNative');
  $('langSelect').value = currentLang;
  $('dateDisplay').textContent = selectedDate ? formatDate(selectedDate) : '';
  renderCountdown();
  PROGRESS.renderHeader('grid', currentLang);
  if (board) renderLive();
}

const addDays = (dateStr, days) => { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

/** Dates are UTC (see todayKey), so the next grid unlocks at 00:00 UTC of its date. */
function renderCountdown() {
  const box = $('nextBoard');
  if (!box) return;
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

// Phones share one header row with the language and buttons, so the date there is short ("30 paź 2026").
const narrowScreen = window.matchMedia('(max-width: 520px)');
const formatDate = d => new Date(d + 'T00:00:00').toLocaleDateString(LOCALE_MAP[currentLang], narrowScreen.matches
  ? { year: 'numeric', month: 'short', day: 'numeric' }
  : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
narrowScreen.addEventListener('change', () => { if (selectedDate) $('dateDisplay').textContent = formatDate(selectedDate); });

function updateNavButtons() {
  $('btnPrevDate').disabled = selectedDateIndex <= 0;
  $('btnNextDate').disabled = selectedDateIndex < 0 || selectedDateIndex >= availableDates.length - 1;
}

/** The guide's first step: an animated cell (T1 × Worlds → Faker). */
const GRID_DEMO = `<div class="onb-demo onb-grid" aria-hidden="true">
  <div class="onb-cond"><img src="assets/logos/teams/t1.webp" alt=""><span>T1</span></div><span class="onb-x">×</span>
  <div class="onb-cond plate"><img src="assets/badges/worlds.webp" alt=""><span>Worlds</span></div><span class="onb-x">→</span>
  <div class="onb-cell"><span class="onb-plus">+</span><span class="onb-typing">Fak</span><span class="onb-done"><img src="players/faker.webp" alt=""><b>Faker</b></span></div>
</div>`;
/** The guide (the "Guide" button; by itself on a first visit). Built anew when the language changes in it. */
function openGuide() {
  ONBOARDING.show('grid', () => ({
    steps: t('onbSteps').map(([title, text], i) => ({ title, text, demo: i === 0 ? GRID_DEMO : '' })),
    labels: { next: t('onbNext'), skip: t('onbSkip'), done: t('onbDone'), close: t('onbClose'), lang: t('onbLang') }
  }));
}
function maybeOnboard() {
  if (ONBOARDING.isNew('grid', 'lolg_state_') || ONBOARDING.reopen('grid')) openGuide();
}

async function init() {
  applyI18n();
  maybeOnboard();
  const [manifest, index] = await Promise.all([fetchJson('grid/index.json'), fetchJson('data/players-index.json', { revalidate: true })]);
  players = (index || []).map(p => ({ ...p, n: normalize(p.nick), nm: normalize(p.name) }));
  playerById = new Map(players.map(p => [p.id, p]));

  if (PREVIEW) {
    availableDates = [PREVIEW];
    loadDate(PREVIEW);
    return;
  }
  const today = todayKey();
  const rawDates = (manifest?.boards || []).map(b => b.date).sort();
  const dates = rawDates.filter(d => d <= today);
  if (!dates.includes(today) && await fetchBoard(today)) dates.push(today);
  availableDates = dates;
  const lastDate = dates[dates.length - 1];
  nextBoardDate = rawDates.find(d => d > today) || (lastDate ? addDays(lastDate, 1) : '');
  startCountdown();
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
  ['resultOverlay', 'searchOverlay'].forEach(id => $(id).classList.add('hidden'));

  // The previous board stays on screen until this one and its images are in, then they swap in one go
  // (hiding it first made the page jump and the logos pop in one by one). Slow images wait 1.5 s at most.
  const b = await fetchBoard(date);
  if (b) await preloadImages(boardImages(b, date), 1500);
  if (seq !== loadSeq) return;
  prefetchBoard(availableDates[selectedDateIndex - 1]);
  prefetchBoard(availableDates[selectedDateIndex + 1]);
  if (!b) {
    board = null;
    $('boardNo').textContent = '';
    $('gameArea').classList.add('hidden');
    $('noPuzzleScreen').classList.remove('hidden');
    return;
  }
  $('noPuzzleScreen').classList.add('hidden');
  board = b;
  state = loadState(date) || newState();
  sendResult();   // a finished game the server didn't get yet
  refreshLive();
  if (PREVIEW && previewParams.has('solved')) state.gameOver = true;
  $('gameArea').classList.remove('hidden');
  // A finished board shows the revealed grid and the "Results" button; the popup opens only right after the game ends.
  render();
}

const cellAnswers = i => board.answers[Math.floor(i / 3)][i % 3];

/* ---------- Player counters (live.js; nothing shows when the API doesn't answer) ---------- */

let live = { date: '', cfg: null, data: null };
function refreshLive() {
  const date = selectedDate;
  Promise.all([LIVE.config(), LIVE.stats('grid', date)]).then(([cfg, data]) => {
    if (date !== selectedDate) return;
    live = { date, cfg, data };
    renderLive();
  });
}
function renderLive() {
  const line = live.date === selectedDate ? LIVE.solvedLine(live.data, live.cfg, selectedDate, currentLang) : '';
  $('liveLine').textContent = line;
  $('liveLine').classList.toggle('hidden', !line);
}

/** Sends the finished game once (state.sent); an unsent one is retried the next time the day is opened. */
function sendResult() {
  const st = state, date = selectedDate;
  if (!st.gameOver || st.sent || PREVIEW) return;
  LIVE.submit('grid', date, { cells: st.cells }).then(ok => {
    if (!ok) return;
    st.sent = true;
    try { localStorage.setItem(stateKey(date), JSON.stringify(st)); } catch { /* storage blocked */ }
    if (date === selectedDate) refreshLive();
  });
}
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
  $('boardNo').textContent = '#' + board.boardId; // the day's number, beside the date
  hideAnswers();
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
        if (state.gameOver) {
          const count = el('button', 'cell-count', esc(t('answers', { n: cellAnswers(i).length })));
          count.type = 'button';
          count.addEventListener('mouseenter', () => showAnswers(count, i, shown));
          count.addEventListener('mouseleave', scheduleHideAnswers);
          // Touch screens have no hover: a tap toggles the list.
          count.addEventListener('click', () => (answersFor === count ? hideAnswers() : showAnswers(count, i, shown)));
          cell.appendChild(count);
        }
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
  if (state.guessesLeft <= 0 || state.cells.every(Boolean)) endGame();
  saveState();
  render();

  if (ok || state.gameOver) {
    closeSearch();
    if (state.gameOver) showResult();
    else showToast(t('correct'));
    return;
  }
  const modal = document.querySelector('.search-modal');
  modal.classList.remove('shake');
  void modal.offsetWidth;
  modal.classList.add('shake');
  renderResults($('searchInput').value);
  setSearchMsg(t('wrong', { nick: nickOf(id) }), true);
}

/* ---------- Answer list (hover on a cell's answer count) ---------- */

let answersFor = null, answersHideTimer = 0;

function showAnswers(anchor, cell, shownId) {
  clearTimeout(answersHideTimer);
  const pop = $('answersPopover');
  const list = pop.querySelector('ul');
  list.innerHTML = '';
  [...cellAnswers(cell)].sort((a, b) => nickOf(a).localeCompare(nickOf(b))).forEach(id => {
    const li = el('li', id === shownId ? 'current' : '');
    li.appendChild(avatar(id, nickOf(id)));
    li.appendChild(el('span', '', esc(nickOf(id))));
    list.appendChild(li);
  });
  if (answersFor) answersFor.classList.remove('active');
  answersFor = anchor;
  anchor.classList.add('active');
  pop.classList.remove('hidden');
  // Below the count, kept inside the viewport (flipped above when there is no room below).
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
  const top = r.bottom + 4 + h > window.innerHeight - 8 ? Math.max(8, r.top - 4 - h) : r.bottom + 4;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function hideAnswers() {
  clearTimeout(answersHideTimer);
  $('answersPopover').classList.add('hidden');
  if (answersFor) answersFor.classList.remove('active');
  answersFor = null;
}

// Short delay so the pointer can move from the count onto the list (e.g. to scroll it).
const scheduleHideAnswers = () => { clearTimeout(answersHideTimer); answersHideTimer = setTimeout(hideAnswers, 150); };

/* ---------- Results ---------- */

const score = () => state.cells.filter(Boolean).length;

/** The game ends: finishedOn (the UTC day it ended) tells streaks a day's puzzle from an archive game (progress.js). */
function endGame() {
  state.gameOver = true;
  state.finishedOn = todayKey();
  PROGRESS.renderHeader('grid', currentLang);
  setTimeout(sendResult, 0);   // after the move is saved
}
const emojiGrid = () => [0, 1, 2].map(r => [0, 1, 2].map(c => (state.cells[r * 3 + c] ? '🟩' : '⬜')).join('')).join('\n');

function buildShareText() {
  return `⚔ LoL Connect #${board.boardId} — ${score()}/9\n\n${emojiGrid()}\n\n${SITE.url(currentLang, 'grid')}`;
}

function showResult() {
  $('resultTitle').textContent = score() === 9 ? t('winTitle') : t('doneTitle');
  $('resultScore').textContent = t('score', { n: score() });
  $('emojiGrid').innerHTML = emojiGrid().replace(/\n/g, '<br>');
  const line = PROGRESS.resultLine('grid', currentLang, selectedDate, board.boardId);
  $('streakLine').textContent = line;
  $('streakLine').classList.toggle('hidden', !line);
  $('resultOverlay').classList.remove('hidden');
}

// Phones get the system share sheet (WhatsApp, Messenger, Discord…); desktops keep the X intent.
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
  // A new toast restarts the timer, so quick taps on several conditions don't cut the last one short.
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => e.classList.remove('show'), Math.max(2200, msg.length * 55));
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
  hideAnswers();
  document.querySelectorAll('.overlay:not(.hidden)').forEach(o => o.classList.add('hidden'));
  activeCell = -1;
});
// One tap ends the game for good, so ask first (easy to hit by accident while scrolling on a phone).
$('btnGiveUp').addEventListener('click', () => $('giveUpOverlay').classList.remove('hidden'));
$('btnGiveUpCancel').addEventListener('click', () => $('giveUpOverlay').classList.add('hidden'));
$('btnGiveUpConfirm').addEventListener('click', () => {
  $('giveUpOverlay').classList.add('hidden');
  endGame();
  saveState();
  render();
  showResult();
});
$('answersPopover').addEventListener('mouseenter', () => clearTimeout(answersHideTimer));
$('answersPopover').addEventListener('mouseleave', scheduleHideAnswers);
document.addEventListener('click', e => {
  if (answersFor && !e.target.closest('.cell-count, #answersPopover')) hideAnswers();
});
window.addEventListener('scroll', hideAnswers, { passive: true });
window.addEventListener('resize', hideAnswers);
$('btnShowResults').addEventListener('click', showResult);
$('btnGuide').addEventListener('click', openGuide);
$('btnShare').addEventListener('click', () => shareResult(buildShareText()));
$('btnCopy').addEventListener('click', () => navigator.clipboard.writeText(buildShareText()).then(() => showToast(t('copied'))));
$('btnPrevDate').addEventListener('click', () => { if (selectedDateIndex > 0) loadDate(availableDates[selectedDateIndex - 1]); });
$('btnNextDate').addEventListener('click', () => { if (selectedDateIndex < availableDates.length - 1) loadDate(availableDates[selectedDateIndex + 1]); });
$('langSelect').addEventListener('change', e => {
  if (SITE.built || !LANGS.includes(e.target.value)) return; // built pages: footer.js opens the other language's URL
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
