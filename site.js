/* Shared by every page, loaded before the game scripts: language ↔ URL mapping.
   Built pages (scripts/build-site.js marks them <html data-built>) have one language per URL — / is English,
   /pl, /es, /fr the others — and the language picker moves to the other URL. The source pages served by the
   local admin server pick the language from the saved choice or the browser and switch it in place. */
const SITE = (() => {
  const LANGS = ['pl', 'en', 'es', 'fr'];
  const ORIGIN = 'https://connect4.lol';
  const built = document.documentElement.hasAttribute('data-built');
  const browserLang = (navigator.languages?.length ? navigator.languages : [navigator.language || ''])
    .map(l => l.slice(0, 2).toLowerCase()).find(l => LANGS.includes(l)) || 'en';
  let saved = null;
  try { saved = localStorage.getItem('lolc_lang'); } catch { /* storage blocked */ }
  const htmlLang = document.documentElement.lang;
  const lang = built && LANGS.includes(htmlLang) ? htmlLang : (LANGS.includes(saved) ? saved : browserLang);
  /** '' (Guess the Pro), 'path' or 'grid' — from /pl/grid, /grid.html, /index.html… */
  const page = location.pathname.replace(/^\/(pl|es|fr)(?=\/|$)/, '').replace(/\.html$/, '')
    .replace(/^\/+|\/+$/g, '').replace(/^index$/, '');
  const path = (l, p = page) => ((l === 'en' ? '' : '/' + l) + (p ? '/' + p : '')) || '/';
  const save = l => { try { localStorage.setItem('lolc_lang', l); } catch { /* storage blocked */ } };
  // Time-limited badges (the "NEW" ribbon on a game tab): gone from data-until (YYYY-MM-DD, UTC) on.
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-until]').forEach(e => { if (today >= e.dataset.until) e.remove(); });
  return { LANGS, built, lang, page, path, url: (l, p) => ORIGIN + path(l, p), save };
})();

/* Owner's own traffic: ?notrack=1 on any page sets umami.disabled in localStorage (the Umami script then sends
   nothing from this browser), ?notrack=0 removes it. The parameter is dropped from the address afterwards. */
(() => {
  const params = new URLSearchParams(location.search);
  const v = params.get('notrack');
  if (v !== '1' && v !== '0') return;
  let msg;
  try {
    if (v === '1') localStorage.setItem('umami.disabled', '1'); else localStorage.removeItem('umami.disabled');
    msg = v === '1' ? 'Umami: tracking disabled in this browser' : 'Umami: tracking enabled again';
  } catch { msg = 'Umami: storage blocked, setting not saved'; }
  console.info(msg);
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;padding:8px 14px;'
    + 'border-radius:8px;background:#111;color:#eee;font:14px sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.5)';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
  params.delete('notrack');
  const q = params.toString();
  history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash);
})();

/* New vs returning visitors in Umami, without cookies or an identifier: localStorage keeps only the visit days per
   game (lolc_visits: { grid: [...], guess: [...], path: [...] }, UTC YYYY-MM-DD — the same day as todayKey() in the games — the
   newest VISIT_DAYS each). Every view of a built game page ('' = guess, 'path', 'grid') adds today to that game. Once per
   browser tab session (sessionStorage lolc_visit_sent, set after the event went to umami.track) the days before today
   are counted and sent as one "visit" event: grid and guess (each game's own days) and type (new without any earlier
   day in either game); the page the visit started on is the event's own URL in Umami. Later views in the
   same session (Grid ↔ Guess, reloads) only record the day. First run without the per-game lists (nothing stored, or
   the earlier plain list of days): they start from the games' saves before today (grid.js lolg_state_<date>,
   guess.js lolgp_state_<date>, path.js lolpa_state_<date>), so earlier players stay returning (archive boards can overcount that once). Blocked
   storage counts as new. Not sent from the admin preview (?preview=) or from the source pages of the local admin
   server (not built). */
(() => {
  if (!SITE.built || !['', 'path', 'grid'].includes(SITE.page)) return;
  if (new URLSearchParams(location.search).has('preview')) return;
  const VISIT_DAYS = 120;
  const mode = SITE.page === 'grid' ? 'grid' : SITE.page === 'path' ? 'path' : 'guess';
  const GAMES = ['grid', 'guess', 'path'];
  const today = new Date().toISOString().slice(0, 10); // same UTC day as todayKey() in the games
  const isDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  const before = { grid: [], guess: [], path: [] };
  try {
    let visits = null;
    try { visits = JSON.parse(localStorage.getItem('lolc_visits')); } catch { /* unreadable: start over */ }
    if (!visits || typeof visits !== 'object' || Array.isArray(visits)) {
      visits = { grid: [], guess: [], path: [] };
      for (let i = 0; i < localStorage.length; i++) {
        const [, prefix, date] = /^(lolg|lolgp|lolpa)_state_(\d{4}-\d{2}-\d{2})$/.exec(localStorage.key(i)) || [];
        if (date && date < today) visits[{ lolg: 'grid', lolgp: 'guess', lolpa: 'path' }[prefix]].push(date);
      }
    }
    for (const game of GAMES) {
      const days = [...new Set((Array.isArray(visits[game]) ? visits[game] : []).filter(isDay))];
      before[game] = days.filter(d => d < today);
      if (game === mode && !days.includes(today)) days.push(today);
      visits[game] = days.sort().slice(-VISIT_DAYS);
    }
    localStorage.setItem('lolc_visits', JSON.stringify({ grid: visits.grid, guess: visits.guess, path: visits.path }));
  } catch { /* storage blocked: counts as new */ }
  try { if (sessionStorage.getItem('lolc_visit_sent')) return; } catch { /* blocked: send anyway */ }
  // Ranges, not exact counts, so the values stay few and can't single anyone out.
  const RANGES = [[0, '0'], [1, '1'], [3, '2-3'], [7, '4-7'], [14, '8-14'], [30, '15-30'], [60, '31-60'], [90, '61-90']];
  const range = n => RANGES.find(([max]) => n <= max)?.[1] || '90+';
  const data = { type: GAMES.some(g => before[g].length) ? 'returning' : 'new', grid: range(before.grid.length), guess: range(before.guess.length), path: range(before.path.length) };
  // The Umami script is deferred: wait for it (every 300 ms, up to ~10 s), then send once per tab session.
  let tries = 0;
  const timer = setInterval(() => {
    if (typeof window.umami?.track === 'function') {
      clearInterval(timer);
      window.umami.track('visit', data);
      try { sessionStorage.setItem('lolc_visit_sent', '1'); } catch { /* storage blocked */ }
    } else if (++tries >= 34) {
      clearInterval(timer); // blocked by an ad blocker or offline: nothing to send to
    }
  }, 300);
})();
