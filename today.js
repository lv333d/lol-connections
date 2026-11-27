/* The other games of the day in the result popup, shared by the three pages (loaded after progress.js):
   #playAlso — "Play also today: [Career Path ▶] [Grid ✓ played]"; once all three of today's puzzles are finished,
   "All done for today — come back tomorrow" (the popup's own countdown is right above). It also keeps the popup
   on one screen (fitResult).
   Status of a game = its save of today's puzzle (PROGRESS.todayStatus): done / started / not played.
   The games call TODAY.render(lang) after loading and after a game ends. */
const TODAY = (() => {
  const GAMES = [
    { mode: 'guess', slug: '', name: 'Guess the Pro',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="8" r="4"/><path d="M2.5 21c.5-4 3.5-6.5 7.5-6.5s7 2.5 7.5 6.5"/><path d="M17.5 3.5a2.3 2.3 0 1 1 3 2.2c-.6.3-.9.7-.9 1.4"/><circle cx="19.6" cy="10" r=".4" fill="currentColor"/></svg>' },
    { mode: 'path', slug: 'path', name: 'Career Path',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="4.5" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19.5" cy="12" r="2.5"/><path d="M7 12h2.5M14.5 12H17"/></svg>' },
    { mode: 'grid', slug: 'grid', name: 'Grid',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="16" y="9.5" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1"/><rect x="16" y="16" width="5" height="5" rx="1"/></svg>' }
  ];
  const T = {
    pl: {
      playAlso: 'Zagraj też dzisiaj:', done: 'zagrane', started: 'w trakcie', play: 'zagraj',
      allDone: 'Wszystko na dziś zrobione — wróć jutro'
    },
    en: {
      playAlso: 'Play also today:', done: 'played', started: 'in progress', play: 'play',
      allDone: 'All done for today — come back tomorrow'
    },
    es: {
      playAlso: 'Juega también hoy:', done: 'jugado', started: 'en curso', play: 'jugar',
      allDone: 'Todo hecho por hoy — vuelve mañana'
    },
    fr: {
      playAlso: 'Jouez aussi aujourd’hui :', done: 'joué', started: 'en cours', play: 'jouer',
      allDone: 'Tout est fait pour aujourd’hui — revenez demain'
    }
  };
  const tr = lang => T[lang] || T.en;
  const here = SITE.page === 'grid' ? 'grid' : SITE.page === 'path' ? 'path' : 'guess';
  const others = GAMES.filter(g => g.mode !== here);
  const href = (g, lang) => (SITE.built ? SITE.path(lang, g.slug) : '/' + g.slug);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const allDone = () => GAMES.every(g => PROGRESS.todayStatus(g.mode) === 'done');

  function statusChip(status, lang) {
    const t = tr(lang);
    const chip = el('span', 'today-chip today-chip-' + (status || 'new'));
    chip.textContent = status === 'done' ? '✓ ' + t.done : status === 'started' ? '… ' + t.started : '▶ ' + t.play;
    return chip;
  }

  /* ---------- Result popup ---------- */
  function renderPopup(lang) {
    const box = document.getElementById('playAlso');
    if (!box) return;
    const t = tr(lang);
    box.replaceChildren();
    if (allDone()) {
      box.appendChild(el('p', 'play-also-done', '✓ ' + t.allDone));
      return;
    }
    box.appendChild(el('p', 'play-also-label', t.playAlso));
    const links = el('div', 'play-also-links');
    for (const g of others) {
      const status = PROGRESS.todayStatus(g.mode);
      const a = el('a', 'play-also-link' + (status === 'done' ? ' is-done' : ''));
      a.href = href(g, lang);
      const icon = el('span', 'play-also-icon');
      icon.innerHTML = g.icon;
      a.append(icon, el('span', 'play-also-name', g.name), statusChip(status, lang));
      links.appendChild(a);
    }
    box.appendChild(links);
  }

  function render(lang = SITE.lang) {
    renderPopup(lang);
  }

  /* ---------- The result popup fits one screen ----------
     The CSS gives the emoji result a size from its row count and the screen height; here it steps down until the
     whole popup fits (never below MIN_EMOJI_PX). Only if it still doesn't fit, the emoji block alone gets a height
     and scrolls — the buttons and links stay visible. */
  const MIN_EMOJI_PX = 11;
  function fitResult() {
    const overlay = document.getElementById('resultOverlay');
    const modal = overlay?.querySelector('.modal');
    const emoji = document.getElementById('emojiGrid');
    if (!modal || !emoji || overlay.classList.contains('hidden')) return;
    const rows = Math.max(1, (emoji.innerHTML.match(/<br>/g) || []).length + 1);
    emoji.style.setProperty('--emoji-rows', rows);
    emoji.style.fontSize = '';
    emoji.style.maxHeight = '';
    emoji.classList.remove('scroll');
    const over = () => modal.scrollHeight - modal.clientHeight;
    let px = parseFloat(getComputedStyle(emoji).fontSize);
    while (over() > 0 && px > MIN_EMOJI_PX) {
      px = Math.max(MIN_EMOJI_PX, px - 1);
      emoji.style.fontSize = px + 'px';
    }
    if (over() > 0) {
      emoji.style.maxHeight = Math.max(px * 1.7, emoji.clientHeight - over()) + 'px';
      emoji.classList.add('scroll');
    }
  }
  const overlay = document.getElementById('resultOverlay');
  if (overlay) {
    new MutationObserver(() => requestAnimationFrame(fitResult)).observe(overlay, { attributes: true, attributeFilter: ['class'], subtree: false });
    window.addEventListener('resize', () => requestAnimationFrame(fitResult));
    document.fonts?.ready.then(() => requestAnimationFrame(fitResult));
  }

  // Another tab may finish a game: refresh the statuses when this one is shown again.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(document.documentElement.lang || SITE.lang); });

  return { render };
})();
