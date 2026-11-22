/* The guide window shared by both games: two short steps with an animated example, a × in the corner and a
   language picker. The "Guide" button opens it; on a first visit it opens by itself, once per game, for a browser
   with no save of that game (lolg_state_* / lolgp_state_*) — players from before never get it unasked — and then
   never again: lolc_onboarded = { grid: 1, guess: 1 } is written when it closes. Blocked storage: not opened by
   itself (it couldn't be remembered).
   The language picker drives the page's own #langSelect: on built pages that opens the other language's address,
   so the window asks (sessionStorage lolc_guide_reopen) to be opened again there; the local pages switch in place
   and the window is rebuilt from the game's strings.
   Admin preview (?preview=… on the local admin server): never opened by itself, except with &newplayer=1
   ("as a new player"), which ignores this browser's saves and remembers nothing. */
const ONBOARDING = (() => {
  const KEY = 'lolc_onboarded';
  const REOPEN = 'lolc_guide_reopen';
  const params = new URLSearchParams(location.search);
  const local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
  const preview = local && params.has('preview');
  const fresh = preview && params.has('newplayer');

  /** { grid?: 1, guess?: 1 }, or null when storage is blocked. */
  function seen() {
    try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' ? v : {}; }
    catch { return null; }
  }
  function hasSave(prefix) {
    try {
      for (let i = 0; i < localStorage.length; i++) if ((localStorage.key(i) || '').startsWith(prefix)) return true;
      return false;
    } catch { return true; }
  }
  /** A new player of this game: nothing saved for it and the guide never closed. */
  function isNew(mode, prefix) {
    if (fresh) return true;
    if (preview) return false;
    const s = seen();
    return s !== null && !s[mode] && !hasSave(prefix);
  }
  function markSeen(mode) {
    if (preview) return;
    try { const s = seen() || {}; s[mode] = 1; localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* blocked */ }
  }
  /** The window was open when the language changed (built pages load the other language's address). */
  function reopen(mode) {
    try {
      if (sessionStorage.getItem(REOPEN) !== mode) return false;
      sessionStorage.removeItem(REOPEN);
      return true;
    } catch { return false; }
  }

  /** build() → { steps: [{ title, text, demo? (HTML) }], labels: { next, skip, done, close, lang } }, called again
   *  after a language change. */
  function show(mode, build) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay onb-overlay';
    overlay.innerHTML = '<div class="modal onb-modal" role="dialog" aria-modal="true" aria-labelledby="onbTitle">'
      + '<div class="onb-top"><label class="onb-lang"><span aria-hidden="true">🌐</span><select></select></label>'
      + '<button type="button" class="onb-close">&times;</button></div>'
      + '<div class="onb-demo-slot"></div><h2 id="onbTitle"></h2><p class="onb-text"></p>'
      + '<div class="onb-dots" aria-hidden="true"></div>'
      + '<div class="onb-actions"><button type="button" class="btn btn-secondary onb-skip"></button><button type="button" class="btn onb-next"></button></div></div>';
    document.body.appendChild(overlay);
    const $ = s => overlay.querySelector(s);
    // Same languages, labels and current value as the footer's picker.
    const pageLang = document.getElementById('langSelect');
    const select = $('.onb-lang select');
    if (pageLang) {
      select.innerHTML = pageLang.innerHTML;
      select.value = pageLang.value;
    } else {
      $('.onb-lang').remove();
    }
    let i = 0;
    let content = build();
    const close = () => { markSeen(mode); overlay.remove(); document.removeEventListener('keydown', onKey); };
    const render = () => {
      const { steps, labels } = content;
      const st = steps[i];
      const last = i === steps.length - 1;
      $('.onb-demo-slot').innerHTML = st.demo || '';
      $('#onbTitle').textContent = st.title;
      $('.onb-text').innerHTML = st.text;   // the games' own strings, with intended <strong>
      $('.onb-dots').innerHTML = steps.map((_, k) => `<span${k === i ? ' class="on"' : ''}></span>`).join('');
      $('.onb-next').textContent = last ? labels.done : labels.next;
      $('.onb-skip').textContent = labels.skip;
      $('.onb-skip').classList.toggle('hidden', last);
      $('.onb-close').setAttribute('aria-label', labels.close);
      select.setAttribute('aria-label', labels.lang);
    };
    select.addEventListener('change', () => {
      try { sessionStorage.setItem(REOPEN, mode); } catch { /* blocked: it just won't reopen */ }
      pageLang.value = select.value;
      pageLang.dispatchEvent(new Event('change'));   // footer.js and the game switch the language
      if (SITE.built) return;   // leaving for the other language's address; the window reopens there
      // Pages that switch in place (local, unbuilt): rebuild here and forget the reopen request.
      try { sessionStorage.removeItem(REOPEN); } catch { /* blocked */ }
      setTimeout(() => { content = build(); render(); }, 0);
    });
    // Escape, × and a click outside close it, like any window of the game.
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    $('.onb-close').addEventListener('click', close);
    $('.onb-skip').addEventListener('click', close);
    $('.onb-next').addEventListener('click', () => { if (i < content.steps.length - 1) { i++; render(); } else close(); });
    render();
    $('.onb-next').focus();
  }

  return { isNew, reopen, show, fresh };
})();
