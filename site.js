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
  /** '' (Grid) or 'connections' — from /pl/connections, /connections.html, /index.html… */
  const page = location.pathname.replace(/^\/(pl|es|fr)(?=\/|$)/, '').replace(/\.html$/, '')
    .replace(/^\/+|\/+$/g, '').replace(/^index$/, '');
  const path = (l, p = page) => ((l === 'en' ? '' : '/' + l) + (p ? '/' + p : '')) || '/';
  const save = l => { try { localStorage.setItem('lolc_lang', l); } catch { /* storage blocked */ } };
  return { LANGS, built, lang, page, path, url: (l, p) => ORIGIN + path(l, p), save };
})();
