/* The mystery player card over Guess the Pro and Career Path: a plain silhouette with a small "?" badge and censored
   (blurred) sample text beside it; when the game is over the card turns over to the player's photo, nick and real
   name.
   Nothing in it gives the answer away before then: the censored text is the same sample for every player (never the
   real nick or its length), and the portrait file is requested only once the game is over. */
const DOSSIER = (() => {
  const SAMPLE = { nick: 'Nickname', name: 'Firstname Lastname' };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const SILHOUETTE = `<svg class="dossier-silhouette" viewBox="0 0 100 110" aria-hidden="true">
    <circle cx="50" cy="38" r="20"/>
    <path d="M10 110c0-24 17-42 40-42s40 18 40 42z"/>
  </svg>`;

  /** The card's content: the hidden side (silhouette, censored sample) or the revealed one (photo, nick, name). */
  function fill(root, opts, revealed) {
    root.innerHTML = '';
    root.classList.toggle('dossier-open', revealed);

    const photo = el('div', 'dossier-photo');
    if (revealed) {
      const img = el('img', 'dossier-img');
      img.alt = '';
      img.src = `players/${encodeURIComponent(opts.photo.id)}.webp`;
      img.addEventListener('error', () => img.replaceWith(el('span', 'dossier-initials',
        (opts.photo.nick || '?').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase())), { once: true });
      photo.appendChild(img);
    } else {
      photo.innerHTML = SILHOUETTE;
      photo.appendChild(el('span', 'dossier-q', '?'));
    }
    root.appendChild(photo);

    const body = el('div', 'dossier-body');
    body.appendChild(el('div', 'dossier-label', revealed ? opts.labelRevealed : opts.label));
    const line = (cls, real, sample) => {
      const e = el('div', cls);
      if (revealed) e.textContent = real;
      else {
        const s = el('span', 'censored', sample);
        s.setAttribute('aria-hidden', 'true');
        e.append(s, el('span', 'visually-hidden', opts.unknown));
      }
      return e;
    };
    body.appendChild(line('dossier-nick', opts.nick, SAMPLE.nick));
    if (!revealed || opts.name) body.appendChild(line('dossier-name', opts.name, SAMPLE.name));
    root.appendChild(body);
  }

  /** opts: { key (the day: the card turns over only when the same day ends), label, labelRevealed, revealed,
   *          photo: { id, nick }, nick, name, unknown (screen-reader text while censored) } */
  function render(root, opts) {
    const flip = root._dossierKey === opts.key && root._dossierRevealed === false && opts.revealed && !reduced.matches;
    root._dossierKey = opts.key;
    root._dossierRevealed = opts.revealed;
    clearTimeout(root._dossierFlip);
    root.classList.remove('flip-out', 'flip-in');
    if (!flip) { fill(root, opts, opts.revealed); return; }

    // The day just ended: the hidden side turns away, and the revealed side turns in (the swap happens edge-on).
    fill(root, opts, false);
    void root.offsetWidth;   // restart the animation
    root.classList.add('flip-out');
    root._dossierFlip = setTimeout(() => {
      fill(root, opts, true);
      root.classList.replace('flip-out', 'flip-in');
      root._dossierFlip = setTimeout(() => root.classList.remove('flip-in'), 400);
    }, 300);
  }

  return { render };
})();
