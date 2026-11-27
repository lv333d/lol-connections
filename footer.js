/* Footer shared by all games (index.html = Guess the Pro, path.html, grid.html): one line — "Fan project · Legal notice · TikTok · Discord"
   — under the game and the full legal notice in a modal (the links to the other games are today.js).
   TikTok and Discord links come from data/site-config.json (set in the admin panel); an empty link is hidden.
   The Riot Games sentence follows Riot's "Legal Jibber Jabber" policy for fan projects.
   On built pages (site.js SITE.built) it also owns the language picker (#langSelect, in the footer): choosing a
   language opens that language's URL (/, /pl, /es, /fr). */
(() => {
  const TEXT = {
    pl: 'LoL Connect to niekomercyjny projekt fanowski. LoL Connect nie jest wspierany przez Riot Games i nie odzwierciedla poglądów ani opinii Riot Games ani nikogo oficjalnie zaangażowanego w tworzenie lub zarządzanie własnościami Riot Games. Riot Games i wszystkie powiązane własności są znakami towarowymi lub zastrzeżonymi znakami towarowymi Riot Games, Inc. Projekt nie jest powiązany z żadną ligą ani drużyną e-sportową — ich nazwy i loga należą do właścicieli. Dane i zdjęcia graczy: {leaguepedia} (teksty na licencji CC BY-SA); prawa do zdjęć należą do ich autorów.',
    en: 'LoL Connect is a non-commercial fan project. LoL Connect isn\'t endorsed by Riot Games and doesn\'t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. This project is not affiliated with any esports league or team — their names and logos belong to their owners. Player data and photos: {leaguepedia} (text licensed CC BY-SA); photos remain the property of their authors.',
    es: 'LoL Connect es un proyecto de fans sin ánimo de lucro. LoL Connect no está respaldado por Riot Games y no refleja los puntos de vista ni las opiniones de Riot Games ni de nadie involucrado oficialmente en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc. Este proyecto no está afiliado a ninguna liga ni equipo de esports; sus nombres y logotipos pertenecen a sus propietarios. Datos y fotos de jugadores: {leaguepedia} (textos con licencia CC BY-SA); las fotos pertenecen a sus autores.',
    fr: 'LoL Connect est un projet de fans non commercial. LoL Connect n\'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc. Ce projet n\'est affilié à aucune ligue ni équipe d\'esport ; leurs noms et logos appartiennent à leurs propriétaires. Données et photos des joueurs : {leaguepedia} (textes sous licence CC BY-SA) ; les photos restent la propriété de leurs auteurs.'
  };
  const UI = {
    pl: { fan: 'Projekt fanowski', legal: 'Informacje prawne', close: 'Zamknij' },
    en: { fan: 'Fan project', legal: 'Legal notice', close: 'Close' },
    es: { fan: 'Proyecto de fans', legal: 'Aviso legal', close: 'Cerrar' },
    fr: { fan: 'Projet de fans', legal: 'Mentions légales', close: 'Fermer' }
  };
  const LANGS = Object.keys(TEXT);
  const pick = lang => (LANGS.includes(lang) ? lang : 'en');

  const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);

  // The legal notice: a modal like the game's own (closes with ×, Escape — the games' handler — or a click outside).
  const overlay = el('div', { id: 'legalOverlay', className: 'overlay hidden' });
  const modal = el('div', { className: 'modal legal-modal' });
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'legalTitle');
  const close = el('button', { type: 'button', className: 'modal-close', innerHTML: '&times;' });
  const title = el('h2', { id: 'legalTitle' });
  const body = el('p', { className: 'legal-text' });
  modal.append(close, title, body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const hideLegal = () => overlay.classList.add('hidden');
  close.addEventListener('click', hideLegal);
  overlay.addEventListener('click', e => { if (e.target === overlay) hideLegal(); });

  // TikTok / Discord from the admin panel; only http(s) links are used.
  const links = { tiktok: '', discord: '' };
  const safeUrl = u => (typeof u === 'string' && /^https:\/\/[^\s"<>]+$/i.test(u.trim()) ? u.trim() : '');

  const line = document.getElementById('footerLine');
  function render(lang) {
    lang = pick(lang);
    const ui = UI[lang];
    const [before, after] = TEXT[lang].split('{leaguepedia}');
    const wiki = el('a', { href: 'https://lol.fandom.com/', target: '_blank', rel: 'noopener', textContent: 'Leaguepedia' });
    body.replaceChildren(document.createTextNode(before), wiki, document.createTextNode(after));
    title.textContent = ui.legal;
    close.setAttribute('aria-label', ui.close);
    if (line) {
      const legalBtn = el('button', { type: 'button', className: 'footer-link', textContent: ui.legal });
      legalBtn.addEventListener('click', () => overlay.classList.remove('hidden'));
      const items = [el('span', { textContent: ui.fan }), legalBtn];
      if (links.tiktok) items.push(el('a', { className: 'footer-link', href: links.tiktok, target: '_blank', rel: 'noopener', textContent: 'TikTok' }));
      if (links.discord) items.push(el('a', { className: 'footer-link', href: links.discord, target: '_blank', rel: 'noopener', textContent: 'Discord' }));
      line.replaceChildren(...items);
    }
  }

  let currentLang = SITE.lang;
  render(currentLang);
  fetch('data/site-config.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then(cfg => {
      if (!cfg) return;
      links.tiktok = safeUrl(cfg.tiktok);
      links.discord = safeUrl(cfg.discord);
      render(currentLang);
    })
    .catch(() => { /* no config: the links stay hidden */ });

  document.getElementById('langSelect')?.addEventListener('change', e => {
    if (!LANGS.includes(e.target.value)) return;
    if (SITE.built) {
      SITE.save(e.target.value);
      location.href = SITE.path(e.target.value) + location.search;
    } else {
      currentLang = e.target.value;
      render(currentLang);
    }
  });
})();
