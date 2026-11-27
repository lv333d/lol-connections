/* ==========================================================================
   Career Path ("Ścieżka kariery") — Game Logic
   One pro player a day (path/YYYY-MM-DD.json { number, playerId, career }): their teams in order, a circle each.
   Two random ones are shown at the start (the same two for everyone that day); every wrong guess shows more, in
   that random order, so the whole path is visible before the last of the MAX_GUESSES guesses. Any player can be guessed (data/players-index.json, the Grid's search with portraits).
   Paths: scripts/build-careers.js (Leaguepedia Tenures, playing stints only, academies merged).
   ========================================================================== */

const LANGS = ['pl', 'en', 'es', 'fr'];
const LOCALE_MAP = { pl: 'pl-PL', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
const MAX_GUESSES = 5;
const START_SHOWN = 2;
const MAX_RESULTS = 30;

const I18N = {
  pl: {
    subtitle: 'Codzienna zagadka LoL esports',
    noPuzzleTitle: '📅 Brak ścieżki na dziś', noPuzzleText: 'Wróć jutro po nową zagadkę!',
    nextBoardIn: 'Nowa ścieżka za', nextBoardSoon: 'Nowa ścieżka już wkrótce',
    guessesLabel: 'Próby:', giveUp: 'Poddaj się', results: 'Wyniki',
    searchPh: 'Wpisz nick gracza…', submitLabel: 'Zgadnij', mysteryLabel: 'Kim jest gracz dnia?', unknownValue: 'ukryte', noResults: 'Brak graczy o takim nicku.', used: 'już był',
    wrong: 'To nie {nick}', hidden: 'Ukryta drużyna', team: 'Drużyna {n}: {name}',
    answerWas: 'Szukany gracz', winTitle: '🏆 Zgadnięte!', loseTitle: '⚔ Koniec gry', score: 'Próby: {n}/{max}',
    share: '𝕏 Udostępnij wynik', shareNative: '📤 Udostępnij wynik', copy: '📋 Kopiuj wynik', copied: 'Skopiowano!',
    giveUpTitle: 'Poddać się?', giveUpText: 'Gra się zakończy i zobaczysz całą ścieżkę oraz szukanego gracza. Tego nie da się cofnąć.',
    giveUpConfirm: 'Poddaj się', giveUpCancel: 'Graj dalej',
    btnGuideLabel: 'Poradnik', newLabel: 'Nowość', streakLabel: 'Seria', pathTab: 'Career Path',
    moreBefore: 'Wcześniej grał poza tier 1', moreAfter: 'Potem grał poza tier 1',
    // The guide window (onboarding.js).
    onbNext: 'Dalej', onbSkip: 'Pomiń', onbDone: 'Gramy!', onbClose: 'Zamknij', onbLang: 'Język',
    onbSteps: [
      ['Career Path', 'Każde kółko to drużyna, w której grał szukany pro-gracz — po kolei, od pierwszej do ostatniej. Na start widać dwie.'],
      ['5 prób', 'Wpisz nick gracza i wybierz go z listy. Każde pudło odkrywa kolejne drużyny, a przed ostatnią próbą widać już całą ścieżkę.']
    ]
  },
  en: {
    subtitle: 'Daily LoL esports puzzle',
    noPuzzleTitle: '📅 No path today', noPuzzleText: 'Come back tomorrow for a new puzzle!',
    nextBoardIn: 'New path in', nextBoardSoon: 'New path coming soon',
    guessesLabel: 'Guesses:', giveUp: 'Give up', results: 'Results',
    searchPh: 'Type a player’s nickname…', submitLabel: 'Guess', mysteryLabel: 'Who is today’s pro?', unknownValue: 'hidden', noResults: 'No player matches.', used: 'guessed',
    wrong: 'Not {nick}', hidden: 'Hidden team', team: 'Team {n}: {name}',
    answerWas: 'The player was', winTitle: '🏆 Got it!', loseTitle: '⚔ Game over', score: 'Guesses: {n}/{max}',
    share: '𝕏 Share result', shareNative: '📤 Share result', copy: '📋 Copy result', copied: 'Copied!',
    giveUpTitle: 'Give up?', giveUpText: 'The game ends and you see the whole path and the player. This cannot be undone.',
    giveUpConfirm: 'Give up', giveUpCancel: 'Keep playing',
    btnGuideLabel: 'Guide', newLabel: 'New', streakLabel: 'Streak', pathTab: 'Career Path',
    moreBefore: 'Played outside tier 1 before', moreAfter: 'Played outside tier 1 after',
    onbNext: 'Next', onbSkip: 'Skip', onbDone: "Let's play!", onbClose: 'Close', onbLang: 'Language',
    onbSteps: [
      ['Career Path', 'Each circle is a team the pro player played for — in order, from the first to the last. Two are shown at the start.'],
      ['5 guesses', 'Type a player’s nickname and pick them from the list. Every miss reveals more teams, and before your last guess the whole path is shown.']
    ]
  },
  es: {
    subtitle: 'Acertijo diario de LoL esports',
    noPuzzleTitle: '📅 Hoy no hay trayectoria', noPuzzleText: '¡Vuelve mañana por un nuevo acertijo!',
    nextBoardIn: 'Nueva trayectoria en', nextBoardSoon: 'Nueva trayectoria muy pronto',
    guessesLabel: 'Intentos:', giveUp: 'Rendirse', results: 'Resultados',
    searchPh: 'Escribe el nick del jugador…', submitLabel: 'Adivinar', mysteryLabel: '¿Quién es el jugador del día?', unknownValue: 'oculto', noResults: 'Ningún jugador coincide.', used: 'ya probado',
    wrong: 'No es {nick}', hidden: 'Equipo oculto', team: 'Equipo {n}: {name}',
    answerWas: 'El jugador era', winTitle: '🏆 ¡Acertaste!', loseTitle: '⚔ Fin del juego', score: 'Intentos: {n}/{max}',
    share: '𝕏 Compartir resultado', shareNative: '📤 Compartir resultado', copy: '📋 Copiar resultado', copied: '¡Copiado!',
    giveUpTitle: '¿Rendirse?', giveUpText: 'La partida termina y verás toda la trayectoria y al jugador. No se puede deshacer.',
    giveUpConfirm: 'Rendirse', giveUpCancel: 'Seguir jugando',
    btnGuideLabel: 'Guía', newLabel: 'Nuevo', streakLabel: 'Racha', pathTab: 'Career Path',
    moreBefore: 'Antes jugó fuera del tier 1', moreAfter: 'Después jugó fuera del tier 1',
    onbNext: 'Siguiente', onbSkip: 'Saltar', onbDone: '¡A jugar!', onbClose: 'Cerrar', onbLang: 'Idioma',
    onbSteps: [
      ['Career Path', 'Cada círculo es un equipo en el que jugó el jugador pro — en orden, del primero al último. Al empezar se ven dos.'],
      ['5 intentos', 'Escribe el nick del jugador y elígelo de la lista. Cada fallo descubre más equipos y antes del último intento ya se ve toda la trayectoria.']
    ]
  },
  fr: {
    subtitle: 'Énigme quotidienne LoL esports',
    noPuzzleTitle: '📅 Pas de parcours aujourd’hui', noPuzzleText: 'Revenez demain pour une nouvelle énigme !',
    nextBoardIn: 'Nouveau parcours dans', nextBoardSoon: 'Nouveau parcours très bientôt',
    guessesLabel: 'Essais :', giveUp: 'Abandonner', results: 'Résultats',
    searchPh: 'Tapez le pseudo du joueur…', submitLabel: 'Deviner', mysteryLabel: 'Qui est le joueur du jour ?', unknownValue: 'caché', noResults: 'Aucun joueur trouvé.', used: 'déjà essayé',
    wrong: 'Ce n’est pas {nick}', hidden: 'Équipe cachée', team: 'Équipe {n} : {name}',
    answerWas: 'Le joueur était', winTitle: '🏆 Trouvé !', loseTitle: '⚔ Partie terminée', score: 'Essais : {n}/{max}',
    share: '𝕏 Partager le résultat', shareNative: '📤 Partager le résultat', copy: '📋 Copier le résultat', copied: 'Copié !',
    giveUpTitle: 'Abandonner ?', giveUpText: 'La partie se termine et vous voyez tout le parcours et le joueur. Impossible de revenir en arrière.',
    giveUpConfirm: 'Abandonner', giveUpCancel: 'Continuer',
    btnGuideLabel: 'Guide', newLabel: 'Nouveau', streakLabel: 'Série', pathTab: 'Career Path',
    moreBefore: 'A joué hors du tier 1 avant', moreAfter: 'A joué hors du tier 1 après',
    onbNext: 'Suivant', onbSkip: 'Passer', onbDone: 'On joue !', onbClose: 'Fermer', onbLang: 'Langue',
    onbSteps: [
      ['Career Path', 'Chaque cercle est une équipe du joueur pro — dans l’ordre, de la première à la dernière. Deux sont visibles au départ.'],
      ['5 essais', 'Tapez le pseudo du joueur et choisissez-le dans la liste. Chaque erreur dévoile d’autres équipes, et avant le dernier essai tout le parcours est visible.']
    ]
  }
};

// Helpers
const $ = id => document.getElementById(id);
let currentLang = SITE.lang;
const fill = (s, vars) => Object.keys(vars || {}).reduce((acc, k) => acc.replace(`{${k}}`, vars[k]), s);
const t = (key, vars) => fill((I18N[currentLang] && I18N[currentLang][key]) ?? I18N.en[key] ?? key, vars);
const esc = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const todayKey = () => new Date().toISOString().slice(0, 10);
const addDays = (dateStr, days) => { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

// State
let availableDates = [], selectedDate = '', selectedDateIndex = -1;
let nextBoardDate = '', countdownTimer = null;
let day = null, answer = null, state = null;
let players = [], playerById = new Map();
let canonId = id => id; // merged player ids (data/player-merge.json) → the id kept
let loadSeq = 0;
let activeResult = -1, resultItems = [], justShown = 0;

// Admin preview: ?preview=YYYY-MM-DD opens that day as a fresh game that is never saved; &solved=1 shows it finished.
const previewParams = new URLSearchParams(location.search);
const PREVIEW = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname)
  && /^\d{4}-\d{2}-\d{2}$/.test(previewParams.get('preview') || '') ? previewParams.get('preview') : '';

const stateKey = date => `lolpa_state_${date}`;
const loadState = date => { if (PREVIEW) return null; try { return JSON.parse(localStorage.getItem(stateKey(date))); } catch { return null; } };
const saveState = () => { if (PREVIEW) return; try { localStorage.setItem(stateKey(selectedDate), JSON.stringify(state)); } catch { /* storage blocked */ } };
const newState = () => ({ guesses: [], gameOver: false, won: false });

async function fetchJson(url, { revalidate = false } = {}) {
  try {
    const res = await (revalidate ? fetch(url, { cache: 'no-cache' }) : fetch(url + '?_=' + Date.now()));
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

/* ---------- Rendering helpers ---------- */

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

/** A team's name without a Leaguepedia qualifier: "Griffin (Korean Team)" → "Griffin". */
// Leaguepedia's qualifiers off a team name: "Griffin (Korean Team)" → "Griffin", "Evil Geniuses.NA" → "Evil Geniuses".
const plain = name => String(name || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/\.(NA|EU|CN|KR|HK|TW|BR|TR|VN|JP|OCE|LAT)$/i, '');
const plainName = team => plain(team.name);
/** A team's short name for its emblem when there is no logo: its tag, else the initials of its name. */
const shortOf = team => team.short || team.name.split(/[\s.-]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 4).toUpperCase();

function teamLogo(team) {
  const img = el('img');
  img.src = `assets/logos/teams/${encodeURIComponent(team.id)}.webp`;
  img.alt = '';
  img.addEventListener('error', () => img.replaceWith(el('span', 'path-emblem', esc(shortOf(team)))), { once: true });
  return img;
}

/* ---------- The path ---------- */

/**
 * How many teams are shown after `misses` wrong guesses: START_SHOWN, then after each miss enough more that the
 * whole path is shown before the last guess (5 guesses, 8 teams: 2 → 4 → 6 → 7 → 8).
 */
function shownAfter(misses, total) {
  let shown = Math.min(START_SHOWN, total);
  for (let m = 1; m <= misses; m++) {
    const left = MAX_GUESSES - m;   // guesses still to come
    if (left <= 0) return total;
    shown += Math.ceil((total - shown) / left);
  }
  return Math.min(shown, total);
}
const misses = () => state.guesses.filter(id => id !== answer.id).length;

/** The bar: a circle per team, revealed ones with the logo, in rows of at most four on phones (path.css). */
/**
 * The order the teams are revealed in: random, but the same for everyone and every reload of the day (seeded by
 * the date and the player) — the first START_SHOWN are shown at the start.
 */
function revealOrder() {
  let h = 2166136261;
  for (const ch of `${day.date}:${day.playerId}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  const order = day.career.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const k = Math.floor(rand() * (i + 1)); [order[i], order[k]] = [order[k], order[i]]; }
  return order;
}

/**
 * The bar: a circle per team in career order, `shown` of them revealed (in revealOrder()); those revealed since
 * `animateFrom` turn over. Rows of at most `cols` circles, a shorter last row centred: phones one row up to 4
 * teams, else two (5 → 3 + 2 … 12 → 6 + 6); wide screens one row up to 8, else two. The joining line is drawn
 * over the laid-out circles (drawLinks).
 */
function renderPath(target, shown, animateFrom = Infinity) {
  const career = day.career, n = career.length;
  const order = revealOrder();
  const open = new Set(order.slice(0, shown));
  const fresh = new Set(order.slice(Math.min(animateFrom, shown), shown));
  const phone = window.matchMedia('(max-width: 520px)').matches;
  const cols = phone ? (n > 4 ? Math.ceil(n / 2) : n) : (n > 8 ? Math.ceil(n / 2) : n);
  target.innerHTML = '';
  target.style.setProperty('--cols', Math.max(cols, 4));
  target.dataset.cols = cols;
  let row = null;
  career.forEach((team, i) => {
    if (i % cols === 0) { row = el('div', 'path-row'); target.appendChild(row); }
    const isOpen = open.has(i);
    const node = el('div', 'path-node' + (isOpen ? ' open' : '') + (fresh.has(i) ? ' just-open' : ''));
    node.setAttribute('role', 'listitem');
    const circle = el('div', 'path-circle');
    if (isOpen) circle.appendChild(teamLogo(team));
    else circle.appendChild(el('span', 'path-q', '?'));
    node.appendChild(circle);
    const label = isOpen ? plain(team.short) || plainName(team) : '';
    node.appendChild(el('div', 'path-name', esc(label)));
    node.setAttribute('aria-label', (isOpen ? t('team', { n: i + 1, name: plainName(team) }) : t('hidden'))
      + (i === 0 && team.before ? '. ' + t('moreBefore') : '') + (i === n - 1 && team.after ? '. ' + t('moreAfter') : ''));
    // A career outside tier 1 before the first / after the last team: a dashed line there (drawLinks) and a note.
    const note = [i === 0 && team.before ? t('moreBefore') : '', i === n - 1 && team.after ? t('moreAfter') : ''].filter(Boolean).join(' · ');
    node.title = (isOpen ? plainName(team) + (team.league ? ' · ' + team.league : '') : t('hidden')) + (note ? ` (${note})` : '');
    if (isOpen) node.addEventListener('click', () => showToast(plainName(team) + (team.league ? ' · ' + team.league : '')));
    // A team outside tier 1 between tier-1 ones: its league on the circle (Karmine Corp · LFL).
    if (isOpen && team.league) node.appendChild(el('span', 'path-league', esc(team.league)));
    row.appendChild(node);
  });
  target.dataset.before = career[0]?.before ? '1' : '';
  target.dataset.after = career[n - 1]?.after ? '1' : '';
  drawLinks(target);
  requestAnimationFrame(fitNicks);
}

/**
 * The line through the circles, in an SVG behind them: straight within a row; from the last circle of a row to the
 * first of the next one with two bends — down from under the last team's name, across the gap between the rows,
 * down into the next circle.
 */
function drawLinks(target) {
  target.querySelector(':scope > svg')?.remove();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'path-links');
  svg.setAttribute('aria-hidden', 'true');
  target.prepend(svg);
  const draw = () => {
    const box = target.getBoundingClientRect();
    if (!box.width) return;
    const pts = [...target.querySelectorAll('.path-node')].map(nd => {
      const c = nd.querySelector('.path-circle').getBoundingClientRect();
      const l = nd.querySelector('.path-name').getBoundingClientRect();
      return { x: c.left + c.width / 2 - box.left, top: c.top - box.top, cy: c.top + c.height / 2 - box.top,
        r: c.width / 2, under: l.bottom - box.top, row: nd.parentElement };
    });
    const d = [];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      if (a.row === b.row) d.push(`M${a.x + a.r} ${a.cy}H${b.x - b.r}`);
      else {
        const mid = (a.under + b.top) / 2;
        d.push(`M${a.x} ${a.under + 3}V${mid}H${b.x}V${b.top}`);
      }
    }
    // Dashed stubs: a career outside tier 1 before the first / after the last team.
    const stub = 40, dash = [];
    const f = pts[0], l = pts.at(-1);
    if (f && target.dataset.before) dash.push(`M${f.x - f.r - stub} ${f.cy}H${f.x - f.r}`);
    if (l && target.dataset.after) dash.push(`M${l.x + l.r} ${l.cy}H${l.x + l.r + stub}`);
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = `<path d="${d.join('')}"/>` + (dash.length ? `<path class="dashed" d="${dash.join('')}"/>` : '');
  };
  requestAnimationFrame(draw);
  // Fonts and logos settle after the first frame, and the window can change size: draw again then.
  if (!target._linksObserver) {
    target._linksObserver = new ResizeObserver(() => requestAnimationFrame(() => target._redraw?.()));
    target._linksObserver.observe(target);
  }
  target._redraw = draw;
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

/* ---------- The mystery player card over the path (dossier.js): revealed when the game is over ---------- */
function renderDossier() {
  DOSSIER.render($('dossier'), {
    key: selectedDate,
    label: t('mysteryLabel'), labelRevealed: t('answerWas'),
    revealed: state.gameOver,
    photo: { id: answer.id, nick: answer.nick },
    nick: answer.nick, name: answer.name || '',
    unknown: t('unknownValue')
  });
}

function render(animate = false) {
  const shownBefore = justShown;
  const shown = state.gameOver ? day.career.length : shownAfter(misses(), day.career.length);
  justShown = shown;
  renderPath($('pathBar'), shown, animate ? shownBefore : Infinity);
  $('guessesLeft').textContent = state.guesses.length;
  $('guessSearch').classList.toggle('hidden', state.gameOver);
  renderDossier();
  const list = $('pathGuesses');
  list.innerHTML = '';
  state.guesses.forEach((id, k) => {
    const p = playerById.get(id) || { id, nick: id };
    const right = id === answer.id;
    const fresh = animate && k === state.guesses.length - 1;   // only the newest card slides in
    const li = el('li', 'path-guess' + (right ? ' right' : ' wrong') + (fresh ? ' fresh' : ''));
    li.appendChild(avatar(p.id, p.nick));
    li.appendChild(el('span', 'path-guess-nick', esc(p.nick)));
    // Drawn marks (a cross of two strokes / a tick), not font glyphs: the same in every font and system.
    li.appendChild(el('span', 'path-guess-mark', right
      ? '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.4 5 8.8 9.6 3.4"/></svg>'
      : '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 3.2 8.8 8.8M8.8 3.2 3.2 8.8"/></svg>'));
    list.appendChild(li);
  });
  requestAnimationFrame(fitNicks);
  $('btnGiveUp').classList.toggle('hidden', state.gameOver);
  $('btnShowResults').classList.toggle('hidden', !state.gameOver);
  $('boardNo').textContent = '#' + day.number;
}

/** A long nick on a guess card (down to 7 px) or team name under a circle (down to 6 px) gets a smaller font until
 *  it fits, instead of "…". */
function fitNicks() {
  document.querySelectorAll('.path-guess-nick, .path-name').forEach(e => {
    e.style.fontSize = '';
    const min = e.classList.contains('path-name') ? 6 : 7;
    let size = parseFloat(getComputedStyle(e).fontSize);
    while (e.scrollWidth > e.clientWidth + 0.5 && size > min) {
      size -= 0.5;
      e.style.fontSize = size + 'px';
    }
  });
}
window.addEventListener('resize', () => requestAnimationFrame(fitNicks));

/* ---------- Language, dates ---------- */

function applyI18n() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
  if (canNativeShare()) $('btnShare').textContent = t('shareNative');
  $('langSelect').value = currentLang;
  $('dateDisplay').textContent = selectedDate ? formatDate(selectedDate) : '';
  if (availableDates.length) updateNavButtons();
  renderCountdown();
  PROGRESS.renderHeader('path', currentLang);
  TODAY.render(currentLang);
  if (day) { renderLive(); render(); }
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
narrowScreen.addEventListener('change', () => {
  if (selectedDate) $('dateDisplay').textContent = formatDate(selectedDate);
  if (day) render();   // the path's rows differ between phones and wide screens
});

function updateNavButtons() {
  $('btnPrevDate').disabled = selectedDateIndex <= 0;
  $('btnNextDate').disabled = selectedDateIndex < 0 || selectedDateIndex >= availableDates.length - 1;
  fitDateNav(availableDates.map(formatDate), availableDates.length); // arrows stay put (site.js)
}
window.addEventListener('lolc:fonts', () => { if (availableDates.length) updateNavButtons(); });
narrowScreen.addEventListener('change', () => { if (availableDates.length) updateNavButtons(); });

/* ---------- Guide (onboarding.js) ---------- */

/** The guide's first step: a path whose circles turn over one by one. */
function pathDemo() {
  const teams = [['fnatic', 'FNC'], ['g2-esports', 'G2'], ['', '?'], ['', '?']];
  return `<div class="onb-demo onb-path" aria-hidden="true">` + teams.map(([id, s], i) => `<span class="onb-node${id ? ' open' : ''}" style="animation-delay:${0.25 * i}s">`
    + (id ? `<img src="assets/logos/teams/${id}.webp" alt="">` : '<b>?</b>') + `</span>`).join('<i class="onb-link"></i>') + '</div>';
}
function openGuide() {
  ONBOARDING.show('path', () => ({
    steps: t('onbSteps').map(([title, text], i) => ({ title, text, demo: i === 0 ? pathDemo() : '' })),
    labels: { next: t('onbNext'), skip: t('onbSkip'), done: t('onbDone'), close: t('onbClose'), lang: t('onbLang') }
  }));
}
function maybeOnboard() {
  if (ONBOARDING.isNew('path', 'lolpa_state_') || ONBOARDING.reopen('path')) openGuide();
}

/* ---------- Start ---------- */

async function init() {
  applyI18n();
  maybeOnboard();
  const [manifest, index] = await Promise.all([fetchJson('path/index.json'), fetchJson('data/players-index.json', { revalidate: true })]);
  ({ players, byId: playerById, canon: canonId } = PLAYER_SEARCH.prepare(index));
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
  const d = await fetchJson(`path/${date}.json`);
  if (seq !== loadSeq) return;
  if (!d || !Array.isArray(d.career) || !d.career.length) {
    day = answer = null;
    $('boardNo').textContent = '';
    $('gameArea').classList.add('hidden');
    $('noPuzzleScreen').classList.remove('hidden');
    return;
  }
  $('noPuzzleScreen').classList.add('hidden');
  day = d;
  answer = playerById.get(d.playerId) || { id: d.playerId, nick: d.playerId, name: '' };
  state = loadState(date) || newState();
  state.guesses = state.guesses.map(canonId); // ids of merged duplicate records → the kept record
  if (PREVIEW && previewParams.has('solved')) state.gameOver = true;
  justShown = 0;
  sendResult();   // a finished game the server didn't get yet
  refreshLive();
  $('gameArea').classList.remove('hidden');
  clearSearch();
  render();
}

/* ---------- Search (any player, with portraits) ---------- */

/** The shared ranking (search.js): nick first, then words of the real name; typos only as a last resort. */
function search(query) {
  return PLAYER_SEARCH.find(players, query, { limit: MAX_RESULTS });
}

function renderResults(query) {
  const list = $('searchResults');
  list.innerHTML = '';
  resultItems = search(query);
  activeResult = -1;
  $('searchInput').setAttribute('aria-expanded', String(resultItems.length > 0 || !!query.trim()));
  if (!resultItems.length) {
    if (query.trim()) list.appendChild(el('li', 'result-item gp-noresults', esc(t('noResults'))));
    return;
  }
  resultItems.forEach((p, idx) => {
    const used = state.guesses.includes(p.id);
    const li = el('li', 'result-item' + (used ? ' disabled' : ''));
    li.id = 'res-' + idx;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-disabled', String(used));
    li.appendChild(avatar(p.id, p.nick));
    const text = el('div', 'result-text');
    text.appendChild(el('div', 'result-nick', esc(p.nick)));
    if (p.name) text.appendChild(el('div', 'result-name', esc(p.name)));
    li.appendChild(text);
    if (used) li.appendChild(el('span', 'result-tag', esc(t('used'))));
    li.addEventListener('mousedown', e => e.preventDefault());
    li.addEventListener('click', () => { if (!used) guess(p.id); });
    list.appendChild(li);
  });
}

function clearSearch() {
  $('searchInput').value = '';
  $('searchResults').innerHTML = '';
  $('searchInput').setAttribute('aria-expanded', 'false');
}

function moveActive(delta) {
  const items = [...document.querySelectorAll('#searchResults .result-item:not(.gp-noresults)')];
  if (!items.length) return;
  activeResult = (activeResult + delta + items.length) % items.length;
  items.forEach((li, i) => li.classList.toggle('active', i === activeResult));
  items[activeResult].scrollIntoView({ block: 'nearest' });
  $('searchInput').setAttribute('aria-activedescendant', items[activeResult].id);
}

function guess(id) {
  if (state.gameOver || state.guesses.includes(id)) return;
  state.guesses.push(id);
  if (state.guesses.length === 1 && !PREVIEW) PROGRESS.started('path', selectedDate);
  if (id === answer.id) state.won = true;
  if (state.won || state.guesses.length >= MAX_GUESSES) endGame();
  saveState();
  clearSearch();
  render(true);
  if (state.gameOver) setTimeout(showResult, 700);
  else {
    showToast(t('wrong', { nick: playerById.get(id)?.nick || id }));
    $('searchInput').focus();
  }
}

/* ---------- End, counters, result ---------- */

function endGame() {
  state.gameOver = true;
  state.finishedOn = todayKey();
  const st = state, date = selectedDate;
  // After the move is saved: the header's streak and the events read the save.
  setTimeout(() => {
    PROGRESS.renderHeader('path', currentLang);
    if (!PREVIEW) PROGRESS.finished('path', date, { result: st.won ? 'won' : st.guesses.length >= MAX_GUESSES ? 'lost' : 'gave-up', tries: st.guesses.length });
    sendResult();
    TODAY.render(currentLang);
  }, 0);
}

let live = { date: '', cfg: null, data: null };
function refreshLive() {
  const date = selectedDate;
  Promise.all([LIVE.config(), LIVE.stats('path', date)]).then(([cfg, data]) => {
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
function sendResult() {
  const st = state, date = selectedDate;
  if (!st.gameOver || st.sent || PREVIEW) return;
  LIVE.submit('path', date, { won: st.won, guesses: Math.max(1, st.guesses.length) }).then(ok => {
    if (!ok) return;
    st.sent = true;
    try { localStorage.setItem(stateKey(date), JSON.stringify(st)); } catch { /* storage blocked */ }
    if (date === selectedDate) refreshLive();
  });
}

/** 🟥🟥🟩 for the guesses, 🏳️ after them when the player gave up. */
function emojiLine() {
  const g = state.guesses.map(id => (id === answer.id ? '🟩' : '🟥')).join('');
  const gaveUp = !state.won && state.guesses.length < MAX_GUESSES;
  return g + (gaveUp ? (g ? ' ' : '') + '🏳️' : '');
}
function buildShareText() {
  const score = state.won ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return `⚔ LoL Connect · ${t('pathTab')} #${day.number} — ${score}\n\n${emojiLine()}\n${'⚫'.repeat(day.career.length)}\n\n${SITE.url(currentLang, 'path')}`;
}

function showResult() {
  $('resultTitle').textContent = state.won ? t('winTitle') : t('loseTitle');
  answerCard($('resultPlayer'));
  renderPath($('resultPath'), day.career.length);
  $('resultScore').textContent = t('score', { n: state.won ? state.guesses.length : 'X', max: MAX_GUESSES });
  $('emojiGrid').textContent = emojiLine();
  const line = PROGRESS.resultLine('path', currentLang, selectedDate, day.number);
  $('streakLine').textContent = line;
  $('streakLine').classList.toggle('hidden', !line);
  TODAY.render(currentLang);
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
  toastTimer = setTimeout(() => e.classList.remove('show'), Math.max(2200, msg.length * 55));
}

/* ---------- Events ---------- */

/** Enter or the arrow button: the highlighted result, else the first one not guessed yet. */
function submitSearch() {
  const idx = activeResult >= 0 ? activeResult : resultItems.findIndex(p => !state.guesses.includes(p.id));
  if (idx >= 0 && !state.guesses.includes(resultItems[idx].id)) guess(resultItems[idx].id);
}
$('searchInput').addEventListener('input', e => renderResults(e.target.value));
// The arrow keeps the focus in the box (no blur closing the list) and acts like Enter.
$('btnSubmitGuess').addEventListener('mousedown', e => e.preventDefault());
$('btnSubmitGuess').addEventListener('click', () => { submitSearch(); $('searchInput').focus(); });
$('searchInput').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); submitSearch(); } else if (e.key === 'Escape') clearSearch();
});
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
  endGame();
  saveState();
  render(true);
  setTimeout(showResult, 700);
});
$('btnShowResults').addEventListener('click', showResult);
$('btnGuide').addEventListener('click', openGuide);
$('btnShare').addEventListener('click', () => shareResult(buildShareText()));
$('btnCopy').addEventListener('click', () => navigator.clipboard.writeText(buildShareText()).then(() => showToast(t('copied'))));
$('btnPrevDate').addEventListener('click', () => { if (selectedDateIndex > 0) loadDate(availableDates[selectedDateIndex - 1]); });
$('btnNextDate').addEventListener('click', () => { if (selectedDateIndex < availableDates.length - 1) loadDate(availableDates[selectedDateIndex + 1]); });
$('langSelect').addEventListener('change', e => {
  if (SITE.built || !LANGS.includes(e.target.value)) return;
  currentLang = e.target.value;
  try { localStorage.setItem('lolc_lang', currentLang); } catch { /* storage blocked */ }
  applyI18n();
});
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.close).classList.add('hidden')));
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); }));

init();
