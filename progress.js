/* Daily streaks shared by both games (index.html, guess.html), from the games' own saves in localStorage —
   nothing new is stored, so players who played before this file existed get their streaks at once.

   Saves: Grid lolg_state_<date> { cells, guessesLeft, wrong, gameOver, finishedOn? },
          Guess the Pro lolgp_state_<date> { guesses, gameOver, won, finishedOn? }.

   Rules (day boundary = 00:00 UTC, the same moment a new puzzle comes out):
   - a day counts for a mode when that day's puzzle was finished (won, lost or given up) on that same UTC day;
     finishedOn (written by the games when a game ends, from this version on) says when; saves without it, i.e.
     older ones, count for their own date — earlier archive games can't be told apart, so they may count once;
   - archive games (another day's puzzle) never count: their finishedOn is not their date;
   - a streak is a run of consecutive counted days ending today, or yesterday while today's puzzle is still open;
   - each game has its own streak (the flame in its header). */
const PROGRESS = (() => {
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const PREFIX = { grid: 'lolg_state_', guess: 'lolgp_state_' };

  const T = {
    pl: {
      streakLine: 'Seria: {n} 🔥 — wróć jutro po #{next}', streakLineNoNext: 'Seria: {n} 🔥 — wróć jutro po nową zagadkę',
      streakLabel: 'Seria: {n}'
    },
    en: {
      streakLine: 'Streak: {n} 🔥 — come back tomorrow for #{next}', streakLineNoNext: 'Streak: {n} 🔥 — come back tomorrow for a new puzzle',
      streakLabel: 'Streak: {n}'
    },
    es: {
      streakLine: 'Racha: {n} 🔥 — vuelve mañana por el #{next}', streakLineNoNext: 'Racha: {n} 🔥 — vuelve mañana por un nuevo acertijo',
      streakLabel: 'Racha: {n}'
    },
    fr: {
      streakLine: 'Série : {n} 🔥 — revenez demain pour le #{next}', streakLineNoNext: 'Série : {n} 🔥 — revenez demain pour une nouvelle énigme',
      streakLabel: 'Série : {n}'
    }
  };
  const fill = (s, v) => Object.keys(v || {}).reduce((a, k) => a.replace(`{${k}}`, v[k]), s);
  const tr = lang => T[lang] || T.en;

  // Admin preview (?preview=… on the local admin server): &streak=N simulates a streak of N days.
  const params = new URLSearchParams(location.search);
  const preview = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname) && params.has('preview');
  const simulated = preview && /^\d{1,4}$/.test(params.get('streak') || '') ? Number(params.get('streak')) : null;

  /** Days that count for a mode's streak: that day's puzzle finished on that day. */
  function streakDays(mode) {
    const prefix = PREFIX[mode];
    const days = new Set();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const date = key.slice(prefix.length);
        if (!DATE.test(date)) continue;
        let state = null;
        try { state = JSON.parse(localStorage.getItem(key)); } catch { /* unreadable save */ }
        if (state && typeof state === 'object' && state.gameOver === true && (!state.finishedOn || state.finishedOn === date)) days.add(date);
      }
    } catch { /* storage blocked: no history */ }
    return days;
  }

  function runs(days) {
    const today = todayKey();
    let current = 0;
    for (let d = days.has(today) ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) current++;
    let best = 0, run = 0, prev = '';
    for (const d of [...days].sort()) {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    return { current, best: Math.max(best, current), today: days.has(today) };
  }

  /** Streak of one game ('grid' or 'guess'). */
  function streak(mode) {
    if (simulated !== null) return { current: simulated, best: simulated, today: true };
    return runs(streakDays(mode));
  }

  /** The flame in the game's header: its streak, dimmed until today's puzzle is finished. No tooltip; the count
   *  is read out to screen readers. */
  function renderHeader(mode, lang) {
    const box = document.getElementById('streakBox');
    const count = document.getElementById('streakCount');
    if (!box || !count) return;
    const s = streak(mode);
    count.textContent = String(s.current);
    box.classList.toggle('streak-off', s.current === 0 || !s.today);
    box.setAttribute('aria-label', fill(tr(lang).streakLabel, { n: s.current }));
  }

  /** "Streak: 5 🔥 — come back tomorrow for #38" for the result window, after today's puzzle (else ''). */
  function resultLine(mode, lang, date, number) {
    if (simulated === null && (preview || date !== todayKey())) return '';
    const s = streak(mode);
    if (!s.current) return '';
    return number ? fill(tr(lang).streakLine, { n: s.current, next: number + 1 }) : fill(tr(lang).streakLineNoNext, { n: s.current });
  }

  return { streak, renderHeader, resultLine };
})();
