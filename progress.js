/* Daily streak shared by all games (index.html = Guess the Pro, path.html, grid.html), from the games' own saves in
   localStorage — nothing new is stored, so the streak is the same before and after an update: whoever had a streak
   in any game keeps at least that one.

   Saves: Grid lolg_state_<date> { cells, guessesLeft, wrong, gameOver, finishedOn? },
          Guess the Pro lolgp_state_<date> { guesses, gameOver, won, finishedOn? },
          Career Path lolpa_state_<date> { guesses, gameOver, won, finishedOn? }.

   Rules (day boundary = 00:00 UTC, the same moment a new puzzle comes out):
   - a day counts for a mode when that day's puzzle was finished — won, lost or given up, a finished game is
     enough — on that same UTC day; finishedOn (written by the games when a game ends) says when; saves without
     it, i.e. older ones, count for their own date — earlier archive games can't be told apart, so they may count once;
   - archive games (another day's puzzle) never count: their finishedOn is not their date;
   - the site's streak (the flame in every header, the line in the result popups) counts a day when at least one
     mode counts it: it is the union of the modes' days, so it is never shorter than any mode's own streak;
   - a streak is a run of consecutive counted days ending today, or yesterday while today is still open;
   - streak(mode) still gives one mode's own streak (per-mode statistics). */
const PROGRESS = (() => {
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const PREFIX = { grid: 'lolg_state_', guess: 'lolgp_state_', path: 'lolpa_state_' };

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

  const MODES = Object.keys(PREFIX);
  /** Days that count for the shared streak: any mode's. */
  function allDays() {
    const days = new Set();
    for (const m of MODES) for (const d of streakDays(m)) days.add(d);
    return days;
  }

  /** The shared streak (no mode), or one game's own ('grid', 'guess', 'path'). */
  function streak(mode) {
    if (simulated !== null) return { current: simulated, best: simulated, today: true };
    return runs(mode ? streakDays(mode) : allDays());
  }

  /** Today's puzzle of a mode: 'done' (finished), 'started' (a guess made) or '' (not opened or no guess yet). */
  function todayStatus(mode) {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(PREFIX[mode] + todayKey())); } catch { /* none */ }
    if (!st || typeof st !== 'object') return '';
    if (st.gameOver === true) return 'done';
    const moved = Array.isArray(st.guesses) ? st.guesses.length > 0
      : (Array.isArray(st.cells) && st.cells.some(Boolean)) || (Array.isArray(st.wrong) && st.wrong.length > 0);
    return moved ? 'started' : '';
  }

  /** The flame in the game's header: the shared streak, dimmed until a game of today is finished. No tooltip; the
   *  count is read out to screen readers. `mode` is unused (kept so the games' calls stay the same). */
  function renderHeader(mode, lang) {
    const box = document.getElementById('streakBox');
    const count = document.getElementById('streakCount');
    if (!box || !count) return;
    const s = streak();
    count.textContent = String(s.current);
    box.classList.toggle('streak-off', s.current === 0 || !s.today);
    box.setAttribute('aria-label', fill(tr(lang).streakLabel, { n: s.current }));
  }

  /** "Streak: 5 🔥 — come back tomorrow for #38" (the shared streak) for the result window, after today's puzzle (else ''). */
  function resultLine(mode, lang, date, number) {
    if (simulated === null && (preview || date !== todayKey())) return '';
    const s = streak();
    if (!s.current) return '';
    return number ? fill(tr(lang).streakLine, { n: s.current, next: number + 1 }) : fill(tr(lang).streakLineNoNext, { n: s.current });
  }

  /* ---------- Umami events (site.js TRACK): one start and one finish per game and day, per mode ----------
     guess-start / path-start / grid-start   { day: 'today' | 'archive' }            first guess of a puzzle
     guess-finish / path-finish / grid-finish { day, result: won | lost | gave-up, tries, score? (Grid 0–9) }
     daily-streak  { days, range }  the shared streak, when the first game of the UTC day is finished
     all-modes-done { days, range } all three of today's puzzles finished
     Ranges like the "visit" event (site.js), so the values stay few. */
  const RANGES = [[1, '1'], [3, '2-3'], [7, '4-7'], [14, '8-14'], [30, '15-30'], [60, '31-60'], [90, '61-90']];
  const range = n => RANGES.find(([max]) => n <= max)?.[1] || '90+';
  const send = (name, data) => { if (!preview && typeof TRACK === 'function') TRACK(name, data); };
  const dayKind = date => (date === todayKey() ? 'today' : 'archive');

  function started(mode, date) { send(`${mode}-start`, { day: dayKind(date) }); }

  /** Call right after the game's save is written (the streak reads it). */
  function finished(mode, date, data) {
    send(`${mode}-finish`, { day: dayKind(date), ...data });
    if (date !== todayKey()) return;
    const done = MODES.filter(m => todayStatus(m) === 'done').length;
    const n = streak().current;
    if (done === 1) send('daily-streak', { days: n, range: range(n) });
    if (done === MODES.length) send('all-modes-done', { days: n, range: range(n) });
  }

  return { streak, todayStatus, todayKey, renderHeader, resultLine, started, finished, MODES };
})();
