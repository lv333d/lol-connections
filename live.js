/* "1 234 players played today" in both games (stage 4). Talks to /api/config, /api/stats and /api/result (api/*.js on Vercel; the local
   admin server answers the same paths with sample data). Everything here is optional: when the API doesn't answer
   (offline, not deployed, an error), nothing is shown and the game works as before.
   Privacy: a random device id (lolc_device) so a device sends one result per game and day — no account, nothing
   personal. The admin preview (?preview=) reads the counters but never sends a result. */
const LIVE = (() => {
  const TIMEOUT = 3500;
  const params = new URLSearchParams(location.search);
  const preview = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname) && params.has('preview');
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const yesterdayKey = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  const LOCALE = { pl: 'pl-PL', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };

  const T = {
    pl: {
      solved: { one: '{n} gracz zagrał dzisiaj', fewPl: '{n} gracze zagrali dzisiaj', other: '{n} graczy zagrało dzisiaj' },
    },
    en: {
      solved: { one: '{n} player played today', other: '{n} players played today' },
    },
    es: {
      solved: { one: '{n} jugador jugó hoy', other: '{n} jugadores jugaron hoy' },
    },
    fr: {
      solved: { one: '{n} joueur a joué aujourd’hui', other: '{n} joueurs ont joué aujourd’hui' },
    }
  };
  const tr = lang => T[lang] || T.en;
  const fill = (s, v) => Object.keys(v).reduce((a, k) => a.replace(`{${k}}`, v[k]), s);
  // Always grouped ("1 234"): Polish and Spanish leave four-digit numbers ungrouped by default.
  const num = (n, lang) => {
    try { return new Intl.NumberFormat(LOCALE[lang] || 'en-US', { useGrouping: 'always' }).format(n); }
    catch { return new Intl.NumberFormat(LOCALE[lang] || 'en-US').format(n); }
  };

  /** Polish: 1 gracz zagrał, 2–4 / 22–24 gracze zagrali, 5+ graczy zagrało. */
  function solvedText(n, lang) {
    const t = tr(lang).solved;
    let form = 'other';
    try {
      const cat = new Intl.PluralRules(LOCALE[lang] || 'en-US').select(n);
      if (cat === 'one') form = 'one';
      else if (lang === 'pl' && cat === 'few') form = 'fewPl';
    } catch { /* old browser: the general form */ }
    return fill(t[form] || t.other, { n: num(n, lang) });
  }

  async function getJson(url, opts = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      return res.ok ? await res.json() : null;
    } catch { return null; } finally { clearTimeout(timer); }
  }

  let configP = null;
  const config = () => (configP ||= getJson('api/config'));
  const stats = (mode, date) => getJson(`api/stats?mode=${mode}&date=${date}`);

  function device() {
    try {
      let id = localStorage.getItem('lolc_device');
      if (!/^[a-z0-9-]{16,64}$/i.test(id || '')) {
        id = (crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''));
        localStorage.setItem('lolc_device', id);
      }
      return id;
    } catch { return null; }
  }

  /** Sends a finished game; true once the server has it (also "already sent"). Today's and yesterday's puzzles only. */
  async function submit(mode, date, payload) {
    if (preview || (date !== todayKey() && date !== yesterdayKey())) return false;
    const id = device();
    if (!id) return false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch('api/result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ mode, date, device: id, ...payload })
      });
      return res.ok || res.status === 409;
    } catch { return false; } finally { clearTimeout(timer); }
  }

  /** "1 234 players played today" — today's puzzle only, and only from the admin's threshold up. */
  function solvedLine(data, cfg, date, lang) {
    if (!data || !cfg || date !== todayKey() || data.played < cfg.showThreshold) return '';
    return solvedText(data.played, lang);
  }

  return { config, stats, submit, solvedLine, preview };
})();
