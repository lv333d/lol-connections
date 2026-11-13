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
  /** '' (Grid) or 'guess' — from /pl/guess, /guess.html, /index.html… */
  const page = location.pathname.replace(/^\/(pl|es|fr)(?=\/|$)/, '').replace(/\.html$/, '')
    .replace(/^\/+|\/+$/g, '').replace(/^index$/, '');
  const path = (l, p = page) => ((l === 'en' ? '' : '/' + l) + (p ? '/' + p : '')) || '/';
  const save = l => { try { localStorage.setItem('lolc_lang', l); } catch { /* storage blocked */ } };
  // Time-limited badges (the "NEW" ribbon on a game tab): gone from data-until (YYYY-MM-DD, UTC) on.
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-until]').forEach(e => { if (today >= e.dataset.until) e.remove(); });
  return { LANGS, built, lang, page, path, url: (l, p) => ORIGIN + path(l, p), save };
})();

/* New vs returning visitors in Umami, without cookies or a new identifier: the games already keep each day's state
   in localStorage (grid.js: lolg_state_<date>, guess.js: lolgp_state_<date>). Days before today with a save mean
   the visitor has played before; today's save is this same visit. Counted here, before the game script runs and
   saves anything, and sent once as the "visit" event. Not sent from the admin preview (?preview=) or from the
   source pages of the local admin server (not built). */
(() => {
  if (!SITE.built || !['', 'guess'].includes(SITE.page)) return;
  if (new URLSearchParams(location.search).has('preview')) return;
  const today = new Date().toISOString().slice(0, 10); // same UTC day as todayKey() in the games
  const days = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const date = /^lolgp?_state_(\d{4}-\d{2}-\d{2})$/.exec(localStorage.key(i))?.[1];
      if (date && date < today) days.add(date); // a day played in both games counts once
    }
  } catch { /* storage blocked: counts as new */ }
  const n = days.size;
  // Ranges, not exact counts, so the values stay few and can't single anyone out.
  const range = n === 0 ? '0' : n === 1 ? '1' : n <= 3 ? '2-3' : n <= 7 ? '4-7' : '8+';
  const data = { type: n ? 'returning' : 'new', days: range, mode: SITE.page === 'guess' ? 'guess' : 'grid' };
  // The Umami script is deferred: wait for it (every 300 ms, up to ~10 s), then send once.
  let tries = 0;
  const timer = setInterval(() => {
    if (typeof window.umami?.track === 'function') {
      clearInterval(timer);
      window.umami.track('visit', data);
    } else if (++tries >= 34) {
      clearInterval(timer); // blocked by an ad blocker or offline: nothing to send to
    }
  }, 300);
})();
