/* ==========================================================================
   LoL Connect — Game Logic
   ========================================================================== */

const CONFIG = {
  suggestionEmail: 'patrykpyt3l@gmail.com',
  discordWebhookUrl: ''
};

const LANGS = ['pl', 'en', 'es', 'fr'];

const GROUP_STYLES = [
  { bg: 'rgba(20, 43, 30, 0.85)', border: '#285c3e', text: '#4ae088', emoji: '🟢' },
  { bg: 'rgba(43, 32, 16, 0.85)', border: '#5c4520', text: '#e0b84a', emoji: '🟡' },
  { bg: 'rgba(16, 32, 58, 0.85)', border: '#204270', text: '#4ab8e0', emoji: '🔵' },
  { bg: 'rgba(44, 18, 40, 0.85)', border: '#5c2054', text: '#e04ac8', emoji: '🟣' }
];
// Index i of DIFFICULTIES uses GROUP_STYLES[i].
const DIFFICULTIES = ['green', 'yellow', 'blue', 'purple'];
const styleFor = difficulty => GROUP_STYLES[DIFFICULTIES.indexOf(difficulty)] || GROUP_STYLES[0];

/** @typedef {import('./types/puzzle').ConnectionsBoard} ConnectionsBoard */
/** @typedef {import('./types/puzzle').ConnectionsCategory} ConnectionsCategory */

const I18N = {
  pl: {
    subtitle: 'cotygodniowa zagadka League of Legends',
    noPuzzleTitle: '📅 Brak planszy',
    noPuzzleText: 'Wróć po nową zagadkę e-sportową!',
    weekLabel: 'Tydzień {n}', nextBoardIn: 'Nowa plansza za', nextBoardSoon: 'Nowa plansza już wkrótce',
    noPuzzleLang: 'Brak tłumaczenia planszy na wybrany język.',
    livesLabel: 'Pozostałe próby:',
    deselect: 'Odznacz', submit: 'Zatwierdź', results: 'Wyniki',
    almost: 'Prawie! Brakowało tylko jednego',
    winTitle: '🏆 Brawo, udało się!', loseTitle: '💀 Gra skończona',
    share: '𝕏 Udostępnij wynik', copy: '📋 Kopiuj wynik', copied: 'Skopiowano!',
    mistakes: 'błędów', guideTitle: '📖 Poradnik',
    puzzleCredit: 'Zagadka zaproponowana przez: {name}',
    guideWhatTitle: 'Co to jest gra?',
    guideWhat: 'LoL Connect to cotygodniowa zagadka inspirowana grą Connections z NYT. Twoim celem jest pogrupowanie 16 elementów w 4 grupy po 4 — każda grupa łączy elementy wspólnym kryterium ze świata League of Legends.',
    guideHowTitle: 'Jak grać?',
    guideHow: ['Kliknij kafelki, aby je zaznaczyć (maks. 4 naraz).', 'Ponowne kliknięcie odznacza kafelek.', 'Naciśnij <strong>Zatwierdź</strong>, gdy masz 4 zaznaczone elementy.', 'Masz 5 prób — każdy błąd kosztuje jedną.'],
    guideColorsTitle: 'Kolory grup',
    colorLabels: ['Zielona', 'Żółta', 'Niebieska', 'Różowa'],
    guideUniqueTitle: 'Jeden element = jedna grupa',
    guideUnique: 'Każdy element należy do dokładnie jednej kategorii. Nie ma nakładających się odpowiedzi — jeśli coś pasuje do grupy, nie pasuje do żadnej innej.',
    guideShareTitle: 'Udostępnianie',
    guideShare: 'Po zakończeniu gry możesz udostępnić swój wynik na 𝕏 lub skopiować go do schowka — bez spoilerów nazw kategorii!',
    suggestTitle: '✉ Propozycja kategorii', suggestNick: 'Nick (opcjonalnie)', suggestNotes: 'Dodatkowe uwagi',
    suggestNickPh: 'Twój nick', suggestNotesPh: 'Opcjonalne uwagi…', suggestSubmit: 'Wyślij propozycję',
    suggestSuccessTitle: 'Dziękujemy!', suggestSuccessText: 'Twoja propozycja została zapisana.', suggestClose: 'Zamknij',
    suggestCategory: 'Kategoria', suggestCategoryPh: 'np. Grali w T1 i w Gen.G',
    suggestExamples: 'Przykładowi gracze (opcjonalnie)', suggestExamplesPh: 'np. Peanut, Ruler, Doran',
    errCategory: 'Opisz kategorię (min. 3 znaki).',
    btnGuideLabel: 'Poradnik', btnSuggestLabel: 'Propozycja'
  },
  en: {
    subtitle: 'weekly League of Legends puzzle',
    noPuzzleTitle: '📅 No puzzle yet',
    noPuzzleText: 'Come back soon for a new e-sports challenge!',
    weekLabel: 'Week {n}', nextBoardIn: 'New puzzle in', nextBoardSoon: 'New puzzle coming soon',
    noPuzzleLang: 'No translation available for the selected language.',
    livesLabel: 'Mistakes remaining:',
    deselect: 'Deselect', submit: 'Submit', results: 'Results',
    almost: 'One away!',
    winTitle: '🏆 Well done!', loseTitle: '💀 Game over',
    share: '𝕏 Share result', copy: '📋 Copy result', copied: 'Copied!',
    mistakes: 'mistakes', guideTitle: '📖 How to play',
    puzzleCredit: 'Puzzle suggested by: {name}',
    guideWhatTitle: 'What is this game?',
    guideWhat: 'LoL Connect is a weekly puzzle inspired by NYT Connections. Group 16 items into 4 sets of 4 — each set shares a League of Legends theme.',
    guideHowTitle: 'How to play',
    guideHow: ['Click tiles to select them (max 4).', 'Click again to deselect.', 'Press <strong>Submit</strong> when 4 tiles are selected.', 'You have 5 lives — each mistake costs one.'],
    guideColorsTitle: 'Group colors',
    colorLabels: ['Green', 'Yellow', 'Blue', 'Purple'],
    guideUniqueTitle: 'One item, one group',
    guideUnique: 'Each item belongs to exactly one category. There are no overlapping answers — if something fits a group, it does not fit any other.',
    guideShareTitle: 'Sharing',
    guideShare: 'After finishing, share your result on 𝕏 or copy to clipboard — no category spoilers!',
    suggestTitle: '✉ Suggest a category', suggestNick: 'Nickname (optional)', suggestNotes: 'Additional notes',
    suggestNickPh: 'Your nickname', suggestNotesPh: 'Optional notes…', suggestSubmit: 'Send suggestion',
    suggestSuccessTitle: 'Thank you!', suggestSuccessText: 'Your suggestion has been saved.', suggestClose: 'Close',
    suggestCategory: 'Category', suggestCategoryPh: 'e.g. Played for both T1 and Gen.G',
    suggestExamples: 'Example players (optional)', suggestExamplesPh: 'e.g. Peanut, Ruler, Doran',
    errCategory: 'Describe the category (at least 3 characters).',
    btnGuideLabel: 'Guide', btnSuggestLabel: 'Suggest'
  },
  es: {
    subtitle: 'acertijo semanal de League of Legends',
    noPuzzleTitle: '📅 Aún no hay puzzle',
    noPuzzleText: '¡Vuelve pronto por un nuevo desafío e-sportivo!',
    weekLabel: 'Semana {n}', nextBoardIn: 'Nuevo puzzle en', nextBoardSoon: 'Nuevo puzzle muy pronto',
    noPuzzleLang: 'No hay traducción del puzzle para el idioma seleccionado.',
    livesLabel: 'Intentos restantes:',
    deselect: 'Desmarcar', submit: 'Enviar', results: 'Resultados',
    almost: '¡Casi! Solo faltaba uno',
    winTitle: '🏆 ¡Bien hecho!', loseTitle: '💀 Fin del juego',
    share: '𝕏 Compartir resultado', copy: '📋 Copiar resultado', copied: '¡Copiado!',
    mistakes: 'errores', guideTitle: '📖 Guía',
    puzzleCredit: 'Acertijo propuesto por: {name}',
    guideWhatTitle: '¿Qué es este juego?',
    guideWhat: 'LoL Connect es un acertijo semanal inspirado en Connections del NYT. Agrupa 16 elementos en 4 grupos de 4 — cada grupo comparte un criterio del mundo de League of Legends.',
    guideHowTitle: 'Cómo jugar',
    guideHow: ['Haz clic en las casillas para seleccionarlas (máx. 4).', 'Haz clic de nuevo para desmarcar.', 'Pulsa <strong>Enviar</strong> con 4 seleccionados.', 'Tienes 5 intentos — cada error cuesta uno.'],
    guideColorsTitle: 'Colores de grupos',
    colorLabels: ['Verde', 'Amarillo', 'Azul', 'Rosa'],
    guideUniqueTitle: 'Un elemento, un grupo',
    guideUnique: 'Cada elemento pertenece a exactamente una categoría. No hay respuestas superpuestas — si encaja en un grupo, no encaja en ningún otro.',
    guideShareTitle: 'Compartir',
    guideShare: 'Al terminar, comparte tu resultado en 𝕏 o cópialo — ¡sin spoilers de categorías!',
    suggestTitle: '✉ Proponer categoría', suggestNick: 'Nick (opcional)', suggestNotes: 'Notas adicionales',
    suggestNickPh: 'Tu nick', suggestNotesPh: 'Notas opcionales…', suggestSubmit: 'Enviar propuesta',
    suggestSuccessTitle: '¡Gracias!', suggestSuccessText: 'Tu propuesta ha sido guardada.', suggestClose: 'Cerrar',
    suggestCategory: 'Categoría', suggestCategoryPh: 'p. ej. Jugaron en T1 y en Gen.G',
    suggestExamples: 'Jugadores de ejemplo (opcional)', suggestExamplesPh: 'p. ej. Peanut, Ruler, Doran',
    errCategory: 'Describe la categoría (mín. 3 caracteres).',
    btnGuideLabel: 'Guía', btnSuggestLabel: 'Proponer'
  },
  fr: {
    subtitle: 'énigme hebdomadaire de League of Legends',
    noPuzzleTitle: '📅 Pas encore de puzzle',
    noPuzzleText: 'Revenez bientôt pour un nouveau défi e-sport !',
    weekLabel: 'Semaine {n}', nextBoardIn: 'Nouveau puzzle dans', nextBoardSoon: 'Nouveau puzzle très bientôt',
    noPuzzleLang: 'Pas de traduction du puzzle pour la langue sélectionnée.',
    livesLabel: 'Essais restants :',
    deselect: 'Désélectionner', submit: 'Valider', results: 'Résultats',
    almost: 'Presque ! Il n\'en manquait qu\'un',
    winTitle: '🏆 Bravo !', loseTitle: '💀 Partie terminée',
    share: '𝕏 Partager le résultat', copy: '📋 Copier le résultat', copied: 'Copié !',
    mistakes: 'erreurs', guideTitle: '📖 Guide',
    puzzleCredit: 'Énigme proposée par : {name}',
    guideWhatTitle: 'Qu\'est-ce que ce jeu ?',
    guideWhat: 'LoL Connect est une énigme hebdomadaire inspirée de Connections du NYT. Regroupez 16 éléments en 4 groupes de 4 — chaque groupe partage un critère de l\'univers League of Legends.',
    guideHowTitle: 'Comment jouer',
    guideHow: ['Cliquez sur les cases pour les sélectionner (max 4).', 'Recliquez pour désélectionner.', 'Appuyez sur <strong>Valider</strong> avec 4 sélectionnés.', 'Vous avez 5 essais — chaque erreur en coûte un.'],
    guideColorsTitle: 'Couleurs des groupes',
    colorLabels: ['Vert', 'Jaune', 'Bleu', 'Rose'],
    guideUniqueTitle: 'Un élément, un groupe',
    guideUnique: 'Chaque élément appartient à exactement une catégorie. Pas de chevauchement — si un élément correspond à un groupe, il n\'en correspond à aucun autre.',
    guideShareTitle: 'Partage',
    guideShare: 'À la fin, partagez votre résultat sur 𝕏 ou copiez-le — sans spoiler les catégories !',
    suggestTitle: '✉ Proposer une catégorie', suggestNick: 'Pseudo (optionnel)', suggestNotes: 'Notes supplémentaires',
    suggestNickPh: 'Votre pseudo', suggestNotesPh: 'Notes optionnelles…', suggestSubmit: 'Envoyer la proposition',
    suggestSuccessTitle: 'Merci !', suggestSuccessText: 'Votre proposition a été enregistrée.', suggestClose: 'Fermer',
    suggestCategory: 'Catégorie', suggestCategoryPh: 'ex. Ont joué chez T1 et chez Gen.G',
    suggestExamples: 'Joueurs d\'exemple (optionnel)', suggestExamplesPh: 'ex. Peanut, Ruler, Doran',
    errCategory: 'Décrivez la catégorie (au moins 3 caractères).',
    btnGuideLabel: 'Guide', btnSuggestLabel: 'Proposer'
  }
};

// Helpers
const $ = id => document.getElementById(id);
/** First supported language from the browser's preferences (e.g. 'pl-PL' → 'pl'), else English. */
const browserLang = () => (navigator.languages?.length ? navigator.languages : [navigator.language || ''])
  .map(l => l.slice(0, 2).toLowerCase()).find(l => LANGS.includes(l)) || 'en';
let currentLang = browserLang();
try { if (LANGS.includes(localStorage.getItem('lolc_lang'))) currentLang = localStorage.getItem('lolc_lang'); } catch { /* storage blocked */ }

function t(key, vars) {
  let s = (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || I18N.pl[key] || key;
  if (vars) Object.keys(vars).forEach(k => { s = s.replace(`{${k}}`, vars[k]); });
  return s;
}

function resolveField(field, lang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field.en || field.pl || Object.values(field)[0] || '';
}

/** @param {ConnectionsCategory} cat */
const itemNames = (cat, lang) => cat.items.map(it => resolveField(it.name, lang));

const tileKey = (g, i) => `${g}-${i}`;
const parseTileKey = key => { const p = key.split('-'); return { g: parseInt(p[0], 10), i: parseInt(p[1], 10) }; };
const groupItemKeys = g => [0, 1, 2, 3].map(i => tileKey(g, i));
const tileLabel = key => { const { g, i } = parseTileKey(key); return resolveField(puzzle.categories[g].items[i]?.name, currentLang); };
const puzzleHasLang = (p, lang) => p.categories.every(c => resolveField(c.title, lang) && itemNames(c, lang).every(Boolean));
const allTileKeys = () => puzzle.categories.flatMap((_, g) => groupItemKeys(g));
const sanitise = str => typeof str === 'string' ? str.replace(/[<>"'\0]/g, '').trim().slice(0, 500) : '';
const esc = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };

// State & Navigation
let availableDates = [], selectedDate = '', selectedDateIndex = -1;
// Boards come out weekly. The countdown targets the next board in the manifest, else the last one + 7 days.
let nextBoardDate = '', countdownTimer = null;
const BOARD_INTERVAL_DAYS = 7;
/** @type {ConnectionsBoard | null} */
let puzzle = null;
let state = null, selected = new Set();
/** @type {Map<string, Promise<ConnectionsBoard | null>>} */
const boardCache = new Map();
let loadSeq = 0;

const todayKey = () => new Date().toISOString().slice(0, 10);
const getStateKey = date => `lolc_state_${date || selectedDate || todayKey()}`;
const loadState = date => { try { return JSON.parse(localStorage.getItem(getStateKey(date))); } catch { return null; } };
const saveState = (st, date) => localStorage.setItem(getStateKey(date), JSON.stringify(st));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Boards are numbered by their place in the archive: the first board is week 1. */
const weekLabel = dateStr => t('weekLabel', { n: availableDates.indexOf(dateStr) + 1 });
const addDays = (dateStr, days) => { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

/** Dates are UTC (see todayKey), so the next board unlocks at 00:00 UTC of its date. */
function renderCountdown() {
  const el = $('nextBoard');
  if (!el) return;
  el.classList.toggle('hidden', !nextBoardDate);
  if (!nextBoardDate) return;
  const ms = Date.parse(nextBoardDate + 'T00:00:00Z') - Date.now();
  if (ms <= 0) { el.textContent = t('nextBoardSoon'); return; }
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
  const hms = [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
  el.textContent = `${t('nextBoardIn')} ${d > 0 ? d + 'd ' : ''}${hms}`;
}

function startCountdown() {
  clearInterval(countdownTimer);
  renderCountdown();
  if (nextBoardDate) countdownTimer = setInterval(renderCountdown, 1000);
}

async function fetchJson(url) {
  try {
    const res = await fetch(url + '?_=' + Date.now());
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.warn('Nie udało się pobrać ' + url, e);
    return null;
  }
}

/** @returns {Promise<ConnectionsBoard | null>} */
function fetchBoard(date) {
  if (!boardCache.has(date)) {
    const p = fetchJson(`puzzles/${date}.json`).then(b => (b?.categories?.length === 4 ? b : null));
    boardCache.set(date, p);
    p.then(b => { if (!b) boardCache.delete(date); });
  }
  return boardCache.get(date);
}

function applyI18n() {
  document.documentElement.lang = currentLang;
  const mappings = {
    subtitle: 'subtitle', noPuzzleTitle: 'noPuzzleTitle', noPuzzleText: 'noPuzzleText',
    livesLabel: 'livesLabel', btnDeselect: 'deselect', btnSubmit: 'submit',
    btnShowResults: 'results', btnShare: 'share', btnCopy: 'copy',
    guideTitle: 'guideTitle', btnGuideLabel: 'btnGuideLabel', btnSuggestLabel: 'btnSuggestLabel',
    suggestTitle: 'suggestTitle', suggestNickLabel: 'suggestNick', suggestNotesLabel: 'suggestNotes',
    suggestCategoryLabel: 'suggestCategory', suggestExamplesLabel: 'suggestExamples',
    btnSuggestSubmit: 'suggestSubmit', suggestSuccessTitle: 'suggestSuccessTitle',
    suggestSuccessText: 'suggestSuccessText', btnSuggestClose: 'suggestClose'
  };
  Object.entries(mappings).forEach(([id, k]) => { const el = $(id); if (el) el.textContent = t(k); });
  if ($('suggestNick')) $('suggestNick').placeholder = t('suggestNickPh');
  if ($('suggestNotes')) $('suggestNotes').placeholder = t('suggestNotesPh');
  if ($('suggestCategory')) $('suggestCategory').placeholder = t('suggestCategoryPh');
  if ($('suggestExamples')) $('suggestExamples').placeholder = t('suggestExamplesPh');
  if ($('dateDisplay')) $('dateDisplay').textContent = selectedDate ? weekLabel(selectedDate) : '';
  renderCountdown();
  if ($('langSelect')) $('langSelect').value = currentLang;

  const swatches = ['#3B6E35', '#7A5A10', '#1A4A7A', '#7A1A4A'];
  $('guideContent').innerHTML = `
    <div class="guide-section"><h3>${t('guideWhatTitle')}</h3><p>${t('guideWhat')}</p></div>
    <div class="guide-section"><h3>${t('guideHowTitle')}</h3><ul>${t('guideHow').map(l => `<li>${l}</li>`).join('')}</ul></div>
    <div class="guide-section"><h3>${t('guideColorsTitle')}</h3>${t('colorLabels').map((l, i) => `<p><span class="color-swatch" style="background:${swatches[i]}"></span> ${l}</p>`).join('')}</div>
    <div class="guide-section"><h3>${t('guideUniqueTitle')}</h3><p>${t('guideUnique')}</p></div>
    <div class="guide-section"><h3>${t('guideShareTitle')}</h3><p>${t('guideShare')}</p></div>
  `;
  renderCredit();
}

function renderCredit() {
  const el = $('puzzleCredit');
  const by = puzzle?.suggestedBy;
  if (by) {
    el.textContent = t('puzzleCredit', { name: by });
    el.classList.remove('hidden');
  } else {
    el.textContent = '';
    el.classList.add('hidden');
  }
}

function updateNavButtons() {
  const p = $('btnPrevDate'), n = $('btnNextDate');
  if (p) p.disabled = selectedDateIndex <= 0;
  if (n) n.disabled = selectedDateIndex < 0 || selectedDateIndex >= availableDates.length - 1;
}

async function loadPuzzlesAndInit() {
  applyI18n();
  ['noPuzzleScreen', 'gameArea', 'resultOverlay'].forEach(id => $(id).classList.add('hidden'));

  const manifest = await fetchJson('puzzles/index.json');
  const rawDates = (manifest?.boards || []).map(b => b.date).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const today = todayKey();
  const pastAndToday = rawDates.filter(d => d <= today);
  // The manifest may lag behind a freshly uploaded file, so today's board is always probed directly.
  if (!pastAndToday.includes(today) && await fetchBoard(today)) pastAndToday.push(today);
  availableDates = pastAndToday.length > 0 ? pastAndToday : rawDates;
  const lastDate = availableDates[availableDates.length - 1];
  nextBoardDate = rawDates.find(d => d > today) || (lastDate ? addDays(lastDate, BOARD_INTERVAL_DAYS) : '');
  startCountdown();

  if (availableDates.length === 0) {
    $('noPuzzleScreen').classList.remove('hidden');
    updateNavButtons();
    return;
  }

  selectedDate = availableDates.includes(today) ? today : availableDates[availableDates.length - 1];
  loadPuzzleForDate(selectedDate);
}

async function loadPuzzleForDate(dateStr) {
  const seq = ++loadSeq;
  selectedDate = dateStr;
  selectedDateIndex = availableDates.indexOf(dateStr);
  selected.clear();
  updateNavButtons();

  $('dateDisplay').textContent = weekLabel(selectedDate);
  ['noPuzzleScreen', 'gameArea', 'resultOverlay'].forEach(id => $(id).classList.add('hidden'));
  $('hintMsg').textContent = '';

  const board = await fetchBoard(dateStr);
  if (seq !== loadSeq) return; // user navigated elsewhere while this board was loading
  if (!board) {
    puzzle = null;
    renderCredit();
    $('noPuzzleScreen').classList.remove('hidden');
    return;
  }

  puzzle = board;

  if (!puzzleHasLang(puzzle, currentLang)) {
    $('noPuzzleTitle').textContent = t('noPuzzleTitle');
    $('noPuzzleText').textContent = t('noPuzzleLang');
    $('noPuzzleScreen').classList.remove('hidden');
    renderCredit();
    return;
  }

  renderCredit();
  state = loadState(selectedDate);
  if (!state) {
    state = { livesLeft: 5, solvedGroups: [], guessHistory: [], gameOver: false, tiles: shuffle(allTileKeys()) };
    saveState(state, selectedDate);
  }

  $('gameArea').classList.remove('hidden');
  // A finished board shows its banners and the "Results" button; the popup only appears when the game ends.
  renderGame();
}

function setLanguage(lang) {
  if (!LANGS.includes(lang) || lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem('lolc_lang', lang);
  applyI18n();
  if (selectedDate) loadPuzzleForDate(selectedDate);
}

function renderLives() {
  const el = $('livesPips');
  el.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const pip = document.createElement('div');
    pip.className = 'pip' + (i >= state.livesLeft ? ' lost' : '');
    el.appendChild(pip);
  }
}

function renderProgress() {
  const el = $('progressBar');
  el.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const seg = document.createElement('div');
    seg.className = 'progress-seg' + (state.solvedGroups.includes(i) ? ' filled' : '');
    el.appendChild(seg);
  }
}

function renderBanners() {
  const el = $('solvedBanners');
  el.innerHTML = '';

  const displayGroups = [...state.solvedGroups];
  if (state.gameOver) {
    puzzle.categories.forEach((_, i) => { if (!displayGroups.includes(i)) displayGroups.push(i); });
  }

  displayGroups.forEach(idx => {
    const g = puzzle.categories[idx];
    const style = styleFor(g.difficulty);
    const cat = resolveField(g.title, currentLang);
    const items = itemNames(g, currentLang);
    const explain = resolveField(g.explain, currentLang);

    const banner = document.createElement('div');
    banner.className = 'group-banner' + (state.solvedGroups.includes(idx) ? '' : ' missed');
    banner.style.background = style.bg;
    banner.style.borderColor = style.border;
    banner.style.color = style.text;

    let html = `<div class="cat">${esc(cat)}</div><div class="items">${items.map(esc).join(', ')}</div>`;
    if (explain) html += `<div class="explain" style="font-size:0.75rem;margin-top:4px;opacity:0.85;font-style:italic;">${esc(explain)}</div>`;
    banner.innerHTML = html;
    el.appendChild(banner);
  });
}

function getRemainingTiles() {
  if (state?.gameOver) return [];
  const solvedKeys = new Set();
  state.solvedGroups.forEach(idx => groupItemKeys(idx).forEach(k => solvedKeys.add(k)));
  return state.tiles.filter(k => !solvedKeys.has(k));
}

function fitTileFont(tile) {
  if (!tile) return;
  tile.style.fontSize = '';
  let size = parseFloat(window.getComputedStyle(tile).fontSize) || 13;
  while (tile.scrollWidth > tile.clientWidth && size > 7) {
    size -= 0.5;
    tile.style.fontSize = size + 'px';
  }
}

const fitAllTileFonts = () => document.querySelectorAll('.tile').forEach(fitTileFont);

function renderGrid() {
  const grid = $('tileGrid');
  grid.innerHTML = '';
  getRemainingTiles().forEach(key => {
    const tile = document.createElement('div');
    tile.className = 'tile' + (selected.has(key) ? ' selected' : '');
    tile.textContent = tileLabel(key);
    tile.addEventListener('click', () => toggleTile(key));
    grid.appendChild(tile);
    fitTileFont(tile);
  });
}

function renderGame() {
  renderLives();
  renderProgress();
  renderBanners();
  renderGrid();
  updateSubmitBtn();

  $('btnDeselect').classList.toggle('hidden', state.gameOver);
  $('btnSubmit').classList.toggle('hidden', state.gameOver);
  $('btnShowResults').classList.toggle('hidden', !state.gameOver);
}

function toggleTile(key) {
  if (state.gameOver) return;
  if (selected.has(key)) selected.delete(key);
  else if (selected.size < 4) selected.add(key);
  renderGrid();
  updateSubmitBtn();
  $('hintMsg').textContent = '';
}

const updateSubmitBtn = () => { $('btnSubmit').disabled = selected.size !== 4; };

function findGroupForKeys(keys) {
  const set = new Set(keys);
  for (let i = 0; i < puzzle.categories.length; i++) {
    if (state.solvedGroups.includes(i)) continue;
    if (groupItemKeys(i).every(k => set.has(k)) && set.size === 4) return i;
  }
  return -1;
}

function checkAlmost(selectedKeys) {
  let best = 0;
  puzzle.categories.forEach((_, i) => {
    if (!state.solvedGroups.includes(i)) {
      const cnt = selectedKeys.filter(k => groupItemKeys(i).includes(k)).length;
      if (cnt > best) best = cnt;
    }
  });
  return best;
}

function submitGuess() {
  if (selected.size !== 4 || state.gameOver) return;
  const keys = [...selected];
  const groupIdx = findGroupForKeys(keys);
  const grid = $('tileGrid');

  if (groupIdx >= 0) {
    state.solvedGroups.push(groupIdx);
    state.guessHistory.push({ correct: true, groupIdx });
    selected.clear();
    grid.classList.remove('shake');
    void grid.offsetWidth;
    grid.classList.add('pulse');
    setTimeout(() => grid.classList.remove('pulse'), 450);
    $('hintMsg').textContent = '';

    if (state.solvedGroups.length === 4) {
      state.gameOver = true;
      saveState(state, selectedDate);
      renderGame();
      setTimeout(showResult, 400);
      return;
    }
  } else {
    state.livesLeft--;
    state.guessHistory.push({ correct: false, tried: keys });
    selected.clear();
    grid.classList.remove('pulse');
    void grid.offsetWidth;
    grid.classList.add('shake');
    setTimeout(() => grid.classList.remove('shake'), 450);

    $('hintMsg').textContent = checkAlmost(keys) === 3 ? t('almost') : '';

    if (state.livesLeft <= 0) {
      state.gameOver = true;
      saveState(state, selectedDate);
      renderGame();
      setTimeout(showResult, 400);
      return;
    }
  }

  saveState(state, selectedDate);
  renderGame();
}

function buildEmojiGrid() {
  return state.guessHistory.map(g => g.correct ? styleFor(puzzle.categories[g.groupIdx].difficulty).emoji.repeat(4) : '⬛⬛⬛⬛').join('\n');
}

function buildShareText() {
  const mistakes = state.guessHistory.filter(g => !g.correct).length;
  return `⚔ LoL Connect — ${weekLabel(selectedDate)}\n${mistakes}/5 ${t('mistakes')}\n\n${buildEmojiGrid()}\n\nhttps://connect4.lol/connections.html`;
}

function showResult() {
  openOverlay('resultOverlay');
  const won = state.solvedGroups.length === 4;
  $('resultTitle').textContent = won ? t('winTitle') : t('loseTitle');
  $('emojiGrid').innerHTML = buildEmojiGrid().replace(/\n/g, '<br>');

  const resContainer = $('revealedCategoriesResult');
  if (resContainer) {
    resContainer.classList.toggle('hidden', !state.gameOver);
    if (state.gameOver) {
      let html = '<div style="margin:16px 0 12px;text-align:left;display:flex;flex-direction:column;gap:8px;">';
      puzzle.categories.forEach(g => {
        const style = styleFor(g.difficulty);
        const cat = resolveField(g.title, currentLang);
        const items = itemNames(g, currentLang);
        const explain = resolveField(g.explain, currentLang);
        html += `<div style="background:${style.bg};border:1px solid ${style.border};color:${style.text};padding:10px 14px;border-radius:6px;">
          <div style="font-family:'Cinzel',serif;font-weight:700;font-size:0.9rem;text-transform:uppercase;">${style.emoji} ${esc(cat)}</div>
          <div style="font-size:0.8rem;opacity:0.95;margin-top:2px;">${items.map(esc).join(', ')}</div>
          ${explain ? `<div style="font-size:0.73rem;opacity:0.85;margin-top:4px;font-style:italic;">${esc(explain)}</div>` : ''}
        </div>`;
      });
      html += '</div>';
      resContainer.innerHTML = html;
    }
  }
}

function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

const openOverlay = id => $(id)?.classList.remove('hidden');
const closeOverlay = id => $(id)?.classList.add('hidden');

async function validateAndSaveSuggestion() {
  const errEl = $('suggestError');
  errEl.classList.add('hidden');

  const nick = sanitise($('suggestNick').value).slice(0, 40);
  const notes = sanitise($('suggestNotes').value).slice(0, 500);
  const category = sanitise($('suggestCategory').value).slice(0, 160);
  const examples = sanitise($('suggestExamples').value).split(/[,;\n]+/).map(s => s.trim().slice(0, 60)).filter(Boolean).slice(0, 12);
  if (category.length < 3) {
    errEl.textContent = t('errCategory');
    errEl.classList.remove('hidden');
    return;
  }

  // Players suggest a category idea, not a whole board. `kind` stays the last key: the admin panel finds the
  // pasted code in an e-mail by its closing `"kind":"category"}`.
  const suggestion = { id: Date.now(), submittedAt: new Date().toISOString(), nick: nick || 'Anonymous', category, examples, notes, kind: 'category' };
  const submitBtn = $('btnSuggestSubmit');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Wysyłanie...';

  let sent = false, fallbackReason = '';
  if (!CONFIG.discordWebhookUrl && !CONFIG.suggestionEmail) fallbackReason = 'Brak skonfigurowanego adresu e-mail';

  if (CONFIG.discordWebhookUrl) {
    try {
      const payload = {
        content: "⚔️ **Nowa propozycja kategorii od gracza!**",
        embeds: [{
          title: "Propozycja kategorii LoL Connect", color: 13150830,
          fields: [
            { name: "Nick", value: suggestion.nick, inline: true },
            { name: "Kategoria", value: category, inline: false },
            { name: "Przykładowi gracze", value: examples.join(', ') || '—', inline: false },
            { name: "Dodatkowe uwagi", value: notes || '—', inline: false }
          ]
        }]
      };
      const res = await fetch(CONFIG.discordWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      sent = res.ok;
      if (!res.ok) fallbackReason = `Serwer Discord zwrócił błąd ${res.status}`;
    } catch { fallbackReason = 'Błąd połączenia z Discord Webhook'; }
  } else if (CONFIG.suggestionEmail) {
    try {
      const payload = {
        Nick: suggestion.nick, Kategoria: category, Przykladowi_gracze: examples.join(', ') || '—', Notes: notes || '—',
        // Pasted into the admin panel (Propozycje → Wklej z e-maila) to add the suggestion to the queue.
        Kod_dla_panelu: JSON.stringify(suggestion),
        _subject: `Nowa propozycja kategorii LoL Connect od ${suggestion.nick}`
      };
      const res = await fetch('https://formsubmit.co/ajax/' + CONFIG.suggestionEmail, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      // FormSubmit answers 200 with { success: "false" } e.g. while the form is not activated yet.
      const data = await res.json().catch(() => ({}));
      sent = res.ok && String(data.success) === 'true';
      if (!sent) fallbackReason = data.message || `FormSubmit zwrócił błąd ${res.status}`;
    } catch { fallbackReason = 'Błąd połączenia z FormSubmit'; }
  }

  submitBtn.disabled = false;
  submitBtn.textContent = originalText;

  $('suggestSuccessIcon').textContent = sent ? '✅' : '❌';
  $('suggestSuccessText').textContent = sent ? t('suggestSuccessText') : `Wystąpił błąd podczas wysyłania propozycji (${fallbackReason}). Spróbuj ponownie później.`;
  $('suggestCopyContainer').classList.add('hidden');

  $('suggestFormView').classList.add('hidden');
  $('suggestSuccessView').classList.remove('hidden');
}

// Event Listeners
$('btnSubmit')?.addEventListener('click', submitGuess);
$('btnDeselect')?.addEventListener('click', () => { selected.clear(); renderGrid(); updateSubmitBtn(); $('hintMsg').textContent = ''; });
$('btnShowResults')?.addEventListener('click', showResult);
$('btnGuide')?.addEventListener('click', () => openOverlay('guideOverlay'));
$('btnSuggest')?.addEventListener('click', () => {
  $('suggestFormView').classList.remove('hidden');
  $('suggestSuccessView').classList.add('hidden');
  $('suggestError').classList.add('hidden');
  $('suggestNick').value = '';
  $('suggestNotes').value = '';
  $('suggestCategory').value = '';
  $('suggestExamples').value = '';
  openOverlay('suggestOverlay');
});
$('btnSuggestSubmit')?.addEventListener('click', validateAndSaveSuggestion);
$('btnSuggestClose')?.addEventListener('click', () => closeOverlay('suggestOverlay'));
$('btnSuggestCopyCode')?.addEventListener('click', () => { navigator.clipboard.writeText($('suggestCopyArea').value).then(() => showToast(t('copied'))); });
$('btnShare')?.addEventListener('click', () => { window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(buildShareText()), '_blank'); });
$('btnCopy')?.addEventListener('click', () => { navigator.clipboard.writeText(buildShareText()).then(() => showToast(t('copied'))); });
$('btnPrevDate')?.addEventListener('click', () => { if (selectedDateIndex > 0) loadPuzzleForDate(availableDates[selectedDateIndex - 1]); });
$('btnNextDate')?.addEventListener('click', () => { if (selectedDateIndex >= 0 && selectedDateIndex < availableDates.length - 1) loadPuzzleForDate(availableDates[selectedDateIndex + 1]); });
$('langSelect')?.addEventListener('change', e => setLanguage(e.target.value));

document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeOverlay(btn.dataset.close)));
document.querySelectorAll('.overlay').forEach(overlay => overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(overlay.id); }));
window.addEventListener('resize', fitAllTileFonts);

loadPuzzlesAndInit();