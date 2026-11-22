/* Stage-1 mock-ups (design/variant-a.html, design/variant-b.html): renders a real board — today's by default,
   ?date=YYYY-MM-DD for another — with two placed answers, so both variants can be judged on live data.
   Mock-up only: nothing is saved, stats/streak are placeholders (stage 2). Polish copy only for now; the final
   pages get all four languages. */
(() => {
  const params = new URLSearchParams(location.search);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : new Date().toISOString().slice(0, 10);
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const COND = {
    coach: ['Trener', 'Był trenerem'],
    retired: ['Emeryt', 'Zakończył karierę zawodniczą'],
    worlds: ['Mistrz Worlds', 'Wygrał Worlds'], msi: ['Mistrz MSI', 'Wygrał MSI'], 'first-stand': ['First Stand', 'Wygrał First Stand']
  };
  const country = code => { try { return new Intl.DisplayNames(['pl'], { type: 'region' }).of(code.toUpperCase()); } catch { return code; } };
  function condInfo(c) {
    switch (c.kind) {
      case 'league': return { img: `../assets/logos/leagues/${c.id}.webp`, short: c.id, long: `Grał lub trenował w ${c.id}` };
      case 'team': return {
        img: `../assets/logos/teams/${encodeURIComponent(c.id)}.webp`, short: c.short || c.label,
        long: `Grał lub trenował w ${c.label}` + (c.aliases?.length ? `. Liczą się też: ${c.aliases.join(', ')}` : '')
      };
      case 'coach': case 'retired': return { img: `../assets/badges/${c.kind}.svg`, short: COND[c.kind][0], long: COND[c.kind][1], plate: true };
      case 'trophy': return { img: `../assets/badges/${c.id}.webp`, short: COND[c.id][0], long: COND[c.id][1], plate: true };
      case 'nationality': return { img: `../assets/flags/${c.id}.svg`, short: country(c.id), long: `Narodowość: ${country(c.id)}`, flag: true };
      case 'teammate': return { img: `../players/${encodeURIComponent(c.playerId)}.webp`, short: c.label, long: `Był w drużynie z ${c.label}`, round: true };
      default: return { img: '', short: '?', long: '?' };
    }
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  window.mockToast = toast;

  function condCard(c, axis) {
    const info = condInfo(c);
    const card = el('div', `cond cond-${c.kind} cond-${axis}`);
    const logo = el('span', 'cond-logo' + (info.plate ? ' plate' : '') + (info.flag ? ' flag' : '') + (info.round ? ' round' : ''));
    const img = el('img');
    img.src = info.img;
    img.alt = '';
    img.addEventListener('error', () => { logo.textContent = info.short.slice(0, 3); logo.classList.add('emblem'); }, { once: true });
    logo.appendChild(img);
    card.append(logo, el('span', 'cond-cap', info.short));
    // "i": the full condition. The visible dot stays small, ::after gives it a 44×44 touch area.
    const i = el('button', 'info', 'i');
    i.type = 'button';
    i.setAttribute('aria-label', info.long);
    i.title = info.long;
    i.addEventListener('click', () => toast(info.long));
    card.appendChild(i);
    return card;
  }

  async function load() {
    const [board, index] = await Promise.all([
      fetch(`../grid/${date}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('../data/players-index.json').then(r => r.json()).catch(() => [])
    ]);
    const byId = new Map(index.map(p => [p.id, p]));
    document.querySelectorAll('[data-board-no]').forEach(e => { e.textContent = board ? `#${board.boardId}` : '#—'; });
    const d = new Date(date + 'T00:00:00Z');
    document.querySelectorAll('[data-date-long]').forEach(e => { e.textContent = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); });
    const grid = $('grid');
    if (!board) { grid.replaceChildren(el('p', 'nogrid', `Brak planszy na ${date}`)); return; }

    // Two answers already placed (the most recognisable valid player per cell), like a game in progress.
    const placed = new Map();
    const used = new Set();
    for (const i of [1, 8]) {
      const ans = board.answers[Math.floor(i / 3)][i % 3].filter(id => byId.has(id) && !used.has(id));
      const best = ans.sort((a, b) => (byId.get(b).t || 0) - (byId.get(a).t || 0))[0];
      if (best) { placed.set(i, byId.get(best)); used.add(best); }
    }
    const left = 9 - placed.size - 1; // one wrong guess too
    document.querySelectorAll('[data-guesses-left]').forEach(e => { e.textContent = left; });
    document.querySelectorAll('[data-pips]').forEach(box => {
      box.replaceChildren(...Array.from({ length: 9 }, (_, k) => el('span', 'pip' + (k < left ? ' on' : ''))));
      box.setAttribute('aria-label', `Pozostałe próby: ${left} z 9`);
    });

    grid.replaceChildren();
    const corner = el('div', 'corner');
    corner.innerHTML = document.getElementById('emblemTpl')?.innerHTML || '';
    grid.appendChild(corner);
    board.cols.forEach(c => grid.appendChild(condCard(c, 'col')));
    board.rows.forEach((r, ri) => {
      grid.appendChild(condCard(r, 'row'));
      board.cols.forEach((c, ci) => {
        const i = ri * 3 + ci;
        const cell = el('button', 'cell');
        cell.type = 'button';
        const p = placed.get(i);
        if (p) {
          cell.classList.add('filled');
          const img = el('img', 'portrait');
          img.src = `../players/${encodeURIComponent(p.id)}.webp`;
          img.alt = '';
          cell.append(img, el('span', 'nick', p.nick));
          cell.setAttribute('aria-label', `${p.nick} — pole ${ri + 1}×${ci + 1}`);
        } else {
          cell.append(el('span', 'plus', '+'));
          cell.setAttribute('aria-label', `Pole ${ri + 1}×${ci + 1}: ${condInfo(r).long} i ${condInfo(c).long.toLowerCase()}`);
          cell.addEventListener('click', () => toast('Makieta: tu otworzy się wyszukiwarka graczy'));
        }
        grid.appendChild(cell);
      });
    });
  }

  // Placeholders for stage 2 and the legal modal.
  document.querySelectorAll('[data-soon]').forEach(b => b.addEventListener('click', () => toast(b.dataset.soon)));
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); $(b.dataset.open).classList.remove('hidden'); }));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).classList.add('hidden')));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); });
  // Footer links set in the admin (stage 1 final): empty = hidden. In the mock-up both are filled.
  load();
})();
