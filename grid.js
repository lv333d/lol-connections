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
    answers: '{n} odp.', btnGuideLabel: 'Poradnik', condInfo: 'Więcej o warunku',
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
    answers: '{n} ans.', btnGuideLabel: 'Guide', condInfo: 'About this condition',
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
    answers: '{n} resp.', btnGuideLabel: 'Guía', condInfo: 'Sobre esta condición',
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
    answers: '{n} rép.', btnGuideLabel: 'Guide', condInfo: 'À propos de cette condition',
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
/** Merged player ids (data/player-merge.json) → the id kept; other ids unchanged. */
let canonId = id => id;
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

/* Team logos, trophies and the coach/retired icons (as in Guess the Pro, guess.js fitLogo, tuned for the Grid's dark cards), measured once per team after loading (a 64×64 canvas, the logo fitted in as on the tile):
   - size: logos are drawn with very different amounts of empty space and shapes (GEN fills its square, BLG and T1 are
     thin wordmarks), so each is scaled to cover about the same area (LOGO_AREA of its box) and its visible part is
     centred — never past the tile's edge (LOGO_MAX); emblems are never shrunk (LOGO_MIN), only solid squares are;
   - halo: dark logos (BRION) get a strong light halo, partly dark ones (100T, Liquid) a thin light outline, black
     one-colour ones (SR, TSM) are shown in negative (grid.css). */
const DARK_LOGO = 0.06;  // mean relative luminance of the visible pixels below which a logo counts as dark
const DARK_PART = 0.2;   // …or this share of its visible pixels is near-black (ELEMENTS lettering, 100, Liquid's shield edge)
const DARK_PX = 0.03;    // relative luminance of a near-black pixel
const NEG_DARK = 0.85, NEG_SAT = 0.1; // a black one-colour logo (SR, Dplus KIA, TSM…) is shown in negative instead
const LOGO_AREA = 0.42;  // target share of the logo box covered by the logo (the median of the current logos)
const LOGO_MAX = 1.24;   // the logo box is 78% of the tile: up to ~97% of the tile
const LOGO_MIN = 1.05;      // compact emblems (round, shields) are never shrunk: they would look smaller than the rest
const LOGO_MIN_SOLID = 0.85; // only logos that are a filled square (NA, SEN: > 90% of their outline) get smaller
const logoFit = new Map(); // team id (or kind:id) → { dark, mixed, neg, s, dx, dy }
function fitLogo(img, id) {
  const apply = () => {
    const f = logoFit.get(id);
    if (!f) return;
    img.classList.toggle('logo-dark', f.dark && !f.neg);
    img.classList.toggle('logo-mixed', f.mixed && !f.dark && !f.neg);
    img.classList.toggle('logo-neg', f.neg);
    img.style.transform = `scale(${f.s.toFixed(3)}) translate(${f.dx.toFixed(1)}%, ${f.dy.toFixed(1)}%)`;
  };
  if (logoFit.has(id)) return apply();
  img.addEventListener('load', () => {
    if (!logoFit.has(id)) logoFit.set(id, measureLogo(img));
    apply();
  }, { once: true });
}
function measureLogo(img) {
  const N = 64;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d', { willReadFrequently: true });
    const nw = img.naturalWidth || N, nh = img.naturalHeight || N; // an SVG with only a viewBox may report 0
    const k = Math.min(N / nw, N / nh); // object-fit: contain
    const w = nw * k, h = nh * k;
    g.drawImage(img, (N - w) / 2, (N - h) / 2, w, h);
    const d = g.getImageData(0, 0, N, N).data;
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    let sum = 0, dark = 0, sat = 0, n = 0, x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      if (d[i + 3] < 100) continue;
      const L = 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      sum += L; if (L < DARK_PX) dark++;
      sat += (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 255;
      n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (!n) return { dark: false, mixed: false, neg: false, s: 1, dx: 0, dy: 0 };
    const bw = (x1 - x0 + 1) / N, bh = (y1 - y0 + 1) / N;
    const area = n / (N * N), solid = area / (bw * bh) > 0.9;
    const s = Math.min(LOGO_MAX / Math.max(bw, bh), Math.max(solid ? LOGO_MIN_SOLID : LOGO_MIN, Math.sqrt(LOGO_AREA / area)));
    return { dark: sum / n < DARK_LOGO, mixed: dark / n >= DARK_PART, neg: dark / n >= NEG_DARK && sat / n < NEG_SAT, s, dx: (0.5 - (x0 + x1 + 1) / 2 / N) * 100, dy: (0.5 - (y0 + y1 + 1) / 2 / N) * 100 };
  } catch { return { dark: false, mixed: false, neg: false, s: 1, dx: 0, dy: 0 }; }
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
  const icon = el('div', 'cond-icon');
  switch (c.kind) {
    case 'league':
      // Drop an official logo at assets/logos/leagues/{ID}.webp (and run make-league-logos.js) to replace the emblem.
      icon.appendChild(logo(conditionImage(c), 'emblem-league', c.id, { 'data-league': c.id }));
      break;
    case 'team':
      { const img = logo(conditionImage(c), 'emblem-team', c.short || c.label);
        if (img.tagName === 'IMG') fitLogo(img, c.id);
        icon.appendChild(img); }
      break;
    case 'coach':
    case 'retired':
    case 'trophy':
      { const img = logo(conditionImage(c), 'emblem-team', short);
        if (img.tagName === 'IMG') fitLogo(img, `${c.kind}:${c.id}`);
        icon.appendChild(img); }
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
  // A tap or click on the card shows the same text in a bubble next to it (tooltip below).
  if (!small) {
    const more = c.kind === 'team' && c.aliases?.length ? `${long}. ${tc('aka')}: ${c.aliases.join(', ')}` : long;
    const info = el('button', 'cond-info', 'i');
    info.type = 'button';
    info.setAttribute('aria-label', `${t('condInfo')}: ${short}`);
    bindTip(info, more);
    wrap.addEventListener('click', e => { if (!e.target.closest('.cond-info')) toggleTip(info, more); });
    wrap.appendChild(info);
  } else {
    wrap.addEventListener('click', () => toggleTip(wrap, long));
  }
  return wrap;
}

/* ---------- Condition bubble (the "i" on the row and column cards) ----------
   One bubble (#condTip, role="tooltip") at a time, placed next to the button that opened it: above it, or below
   when there is no room above, and moved sideways to stay on screen (the arrow keeps pointing at the button).
   Mouse: shows on hover, a click pins it. Touch: a tap opens / closes it. Keyboard: Enter or Space on the button.
   Closes on a click outside, Esc (before anything else Esc does), opening another one, scrolling or resizing.
   While open, the button points at it with aria-describedby. */
let tipFor = null, tipPinned = false, tipHideTimer = 0;
const tipBox = (() => {
  const box = el('div', 'cond-tip hidden');
  box.id = 'condTip';
  box.setAttribute('role', 'tooltip');
  box.appendChild(el('span', 'cond-tip-text'));
  document.body.appendChild(box);
  box.addEventListener('pointerenter', () => clearTimeout(tipHideTimer));
  box.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !tipPinned) scheduleCloseTip(); });
  return box;
})();

function openTip(anchor, text, pinned) {
  clearTimeout(tipHideTimer);
  if (tipFor && tipFor !== anchor) closeTip();
  tipFor = anchor;
  tipPinned = pinned;
  tipBox.firstChild.textContent = text;
  tipBox.classList.remove('hidden', 'below');
  anchor.setAttribute('aria-describedby', 'condTip');
  anchor.classList.add('tip-open');
  placeTip();
}

function placeTip() {
  if (!tipFor) return;
  const r = tipFor.getBoundingClientRect();
  const w = tipBox.offsetWidth, h = tipBox.offsetHeight, gap = 10, edge = 8;
  const below = r.top - gap - h < edge;
  const cx = r.left + r.width / 2;
  const left = Math.max(edge, Math.min(cx - w / 2, window.innerWidth - w - edge));
  const top = below ? Math.min(r.bottom + gap, window.innerHeight - h - edge) : r.top - gap - h;
  tipBox.classList.toggle('below', below);
  tipBox.style.left = left + 'px';
  tipBox.style.top = Math.max(edge, top) + 'px';
  tipBox.style.setProperty('--arrow-x', Math.max(12, Math.min(w - 12, cx - left)) + 'px');
}

function closeTip() {
  clearTimeout(tipHideTimer);
  if (!tipFor) return;
  tipFor.removeAttribute('aria-describedby');
  tipFor.classList.remove('tip-open');
  tipFor = null;
  tipPinned = false;
  tipBox.classList.add('hidden');
}
const scheduleCloseTip = () => { clearTimeout(tipHideTimer); tipHideTimer = setTimeout(closeTip, 150); };
function toggleTip(anchor, text) {
  if (tipFor === anchor && tipPinned) closeTip(); else openTip(anchor, text, true);
}
function bindTip(btn, text) {
  btn.addEventListener('click', e => { e.stopPropagation(); toggleTip(btn, text); });
  // Hover only for a real mouse: on touch the tap (click) does it, or the bubble would open and close at once.
  btn.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !(tipFor === btn && tipPinned)) openTip(btn, text, false); });
  btn.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && tipFor === btn && !tipPinned) scheduleCloseTip(); });
  btn.addEventListener('blur', () => { if (tipFor === btn && !btn.matches(':hover')) closeTip(); });
}
document.addEventListener('click', e => { if (tipFor && !tipFor.contains(e.target) && !tipBox.contains(e.target) && !e.target.closest('.cond')) closeTip(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && tipFor) { const a = tipFor; closeTip(); a.focus?.(); e.stopImmediatePropagation(); }
}, true);
window.addEventListener('scroll', closeTip, { passive: true });
window.addEventListener('resize', closeTip);

/* ---------- Condition names that don't fit get smaller ----------
   A caption keeps its size when it fits (two lines at most, no word wider than the card) and steps down to
   CAPTION_MIN_PX otherwise, so "JACKEYLOVE" or "KOREA POŁUDNIOWA" is never cut. Run after every render, when the
   search window opens, on resize and once the web fonts are in. */
const CAPTION_MIN_PX = 6;
function fitCaptions(root = document) {
  root.querySelectorAll('.cond-caption').forEach(c => {
    c.style.fontSize = '';
    c.style.letterSpacing = '';
    if (!c.clientWidth) return; // hidden
    let px = parseFloat(getComputedStyle(c).fontSize);
    while ((c.scrollWidth > c.clientWidth + 0.5 || c.scrollHeight > c.clientHeight + 0.5) && px > CAPTION_MIN_PX) {
      px = Math.max(CAPTION_MIN_PX, px - 0.5);
      c.style.fontSize = px + 'px';
      c.style.letterSpacing = '0'; // shrunk captions drop the extra spacing first
    }
  });
}
let captionFrame = 0;
const scheduleCaptions = () => { cancelAnimationFrame(captionFrame); captionFrame = requestAnimationFrame(() => fitCaptions()); };
window.addEventListener('resize', scheduleCaptions);
document.fonts?.ready.then(scheduleCaptions);

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
  if (availableDates.length) updateNavButtons();
  renderCountdown();
  PROGRESS.renderHeader('grid', currentLang);
  TODAY.render(currentLang);
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
  fitDateNav(availableDates.map(formatDate), availableDates.length); // arrows stay put (site.js)
}
window.addEventListener('lolc:fonts', () => { if (availableDates.length) updateNavButtons(); });
narrowScreen.addEventListener('change', () => { if (availableDates.length) updateNavButtons(); });

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
  ({ players, byId: playerById, canon: canonId } = PLAYER_SEARCH.prepare(index));

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
  // Saves made before two records of one player were merged point at the kept id now (it is in the answers).
  state.cells = state.cells.map(id => id && canonId(id));
  state.wrong = state.wrong.map(w => ({ ...w, id: canonId(w.id) }));
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
  scheduleCaptions();
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
  fitCaptions($('searchConds'));
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

/** The shared ranking (search.js): nick first, then words of the real name; typos only as a last resort. */
function search(query) {
  return PLAYER_SEARCH.find(players, query, { limit: MAX_RESULTS });
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
  if (state.guessesLeft === MAX_GUESSES && !PREVIEW) PROGRESS.started('grid', selectedDate);
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
  const st = state, date = selectedDate;
  // After the move is saved: the header's streak and the events read the save.
  setTimeout(() => {
    PROGRESS.renderHeader('grid', currentLang);
    const n = st.cells.filter(Boolean).length;
    if (!PREVIEW) PROGRESS.finished('grid', date, { result: n === 9 ? 'won' : st.guessesLeft > 0 ? 'gave-up' : 'lost', tries: MAX_GUESSES - st.guessesLeft, score: n });
    sendResult();
    TODAY.render(currentLang);
  }, 0);
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
  TODAY.render(currentLang);
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
