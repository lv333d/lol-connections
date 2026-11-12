/* Legal footer shared by all games (index.html, guess.html, connections.html), plus the "next game" link in
   their result popups.
   The Riot Games sentence follows Riot's "Legal Jibber Jabber" policy for fan projects.
   On built pages (site.js SITE.built) it also owns the language picker: choosing a language opens that
   language's URL (/, /pl, /es, /fr). */
(() => {
  const TEXT = {
    pl: 'LoL Connect to niekomercyjny projekt fanowski. LoL Connect nie jest wspierany przez Riot Games i nie odzwierciedla poglądów ani opinii Riot Games ani nikogo oficjalnie zaangażowanego w tworzenie lub zarządzanie własnościami Riot Games. Riot Games i wszystkie powiązane własności są znakami towarowymi lub zastrzeżonymi znakami towarowymi Riot Games, Inc. Projekt nie jest powiązany z żadną ligą ani drużyną e-sportową — ich nazwy i loga należą do właścicieli. Dane i zdjęcia graczy: {leaguepedia} (teksty na licencji CC BY-SA); prawa do zdjęć należą do ich autorów.',
    en: 'LoL Connect is a non-commercial fan project. LoL Connect isn\'t endorsed by Riot Games and doesn\'t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. This project is not affiliated with any esports league or team — their names and logos belong to their owners. Player data and photos: {leaguepedia} (text licensed CC BY-SA); photos remain the property of their authors.',
    es: 'LoL Connect es un proyecto de fans sin ánimo de lucro. LoL Connect no está respaldado por Riot Games y no refleja los puntos de vista ni las opiniones de Riot Games ni de nadie involucrado oficialmente en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc. Este proyecto no está afiliado a ninguna liga ni equipo de esports; sus nombres y logotipos pertenecen a sus propietarios. Datos y fotos de jugadores: {leaguepedia} (textos con licencia CC BY-SA); las fotos pertenecen a sus autores.',
    fr: 'LoL Connect est un projet de fans non commercial. LoL Connect n\'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc. Ce projet n\'est affilié à aucune ligue ni équipe d\'esport ; leurs noms et logos appartiennent à leurs propriétaires. Données et photos des joueurs : {leaguepedia} (textes sous licence CC BY-SA) ; les photos restent la propriété de leurs auteurs.'
  };
  const LANGS = Object.keys(TEXT);

  // "Next game" link in each game's result popup (#nextGame): Grid → Guess the Pro → Connections → Grid.
  const GAMES = [{ slug: '', icon: 'icon-grid3', name: 'Grid' }, { slug: 'guess', text: '?', name: 'Guess the Pro' }, { slug: 'connections', icon: 'icon-rows4', name: 'Connections' }];
  const NEXT = { pl: 'Następna gra', en: 'Next game', es: 'Siguiente juego', fr: 'Jeu suivant' };
  function renderNextGame(lang) {
    const a = document.getElementById('nextGame');
    if (!a) return;
    const next = GAMES[(GAMES.findIndex(g => g.slug === SITE.page) + 1) % GAMES.length];
    // Built pages keep the language in the URL; the local admin server serves the plain templates.
    a.href = SITE.built ? SITE.path(lang, next.slug) : '/' + next.slug;
    a.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'next-game-label';
    label.textContent = NEXT[lang] || NEXT.en;
    const name = document.createElement('span');
    name.className = 'next-game-name';
    // Grid and Connections have drawn icons (.icon-grid3, .icon-rows4 in style.css), Guess the Pro a character.
    const icon = Object.assign(document.createElement('span'), { className: next.icon || 'next-game-char', textContent: next.text || '' });
    name.append(icon, `${next.name} →`);
    a.append(label, name);
  }

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  document.body.appendChild(footer);

  function render(lang) {
    const text = TEXT[LANGS.includes(lang) ? lang : 'en'];
    const [before, after] = text.split('{leaguepedia}');
    const link = document.createElement('a');
    link.href = 'https://lol.fandom.com/';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Leaguepedia';
    footer.replaceChildren(document.createTextNode(before), link, document.createTextNode(after));
    renderNextGame(LANGS.includes(lang) ? lang : 'en');
  }

  render(SITE.lang);
  document.getElementById('langSelect')?.addEventListener('change', e => {
    if (!LANGS.includes(e.target.value)) return;
    if (SITE.built) {
      SITE.save(e.target.value);
      location.href = SITE.path(e.target.value) + location.search;
    } else {
      render(e.target.value);
    }
  });
})();
