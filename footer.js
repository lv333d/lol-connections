/* Legal footer shared by both games (index.html, connections.html).
   The Riot Games sentence follows Riot's "Legal Jibber Jabber" policy for fan projects. */
(() => {
  const TEXT = {
    pl: 'LoL Connect to niekomercyjny projekt fanowski. LoL Connect nie jest wspierany przez Riot Games i nie odzwierciedla poglądów ani opinii Riot Games ani nikogo oficjalnie zaangażowanego w tworzenie lub zarządzanie własnościami Riot Games. Riot Games i wszystkie powiązane własności są znakami towarowymi lub zastrzeżonymi znakami towarowymi Riot Games, Inc. Projekt nie jest powiązany z żadną ligą ani drużyną e-sportową — ich nazwy i loga należą do właścicieli. Dane i zdjęcia graczy: {leaguepedia} (teksty na licencji CC BY-SA); prawa do zdjęć należą do ich autorów.',
    en: 'LoL Connect is a non-commercial fan project. LoL Connect isn\'t endorsed by Riot Games and doesn\'t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. This project is not affiliated with any esports league or team — their names and logos belong to their owners. Player data and photos: {leaguepedia} (text licensed CC BY-SA); photos remain the property of their authors.',
    es: 'LoL Connect es un proyecto de fans sin ánimo de lucro. LoL Connect no está respaldado por Riot Games y no refleja los puntos de vista ni las opiniones de Riot Games ni de nadie involucrado oficialmente en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc. Este proyecto no está afiliado a ninguna liga ni equipo de esports; sus nombres y logotipos pertenecen a sus propietarios. Datos y fotos de jugadores: {leaguepedia} (textos con licencia CC BY-SA); las fotos pertenecen a sus autores.',
    fr: 'LoL Connect est un projet de fans non commercial. LoL Connect n\'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc. Ce projet n\'est affilié à aucune ligue ni équipe d\'esport ; leurs noms et logos appartiennent à leurs propriétaires. Données et photos des joueurs : {leaguepedia} (textes sous licence CC BY-SA) ; les photos restent la propriété de leurs auteurs.'
  };
  const LANGS = Object.keys(TEXT);

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
  }

  let lang = 'en';
  try { lang = localStorage.getItem('lolc_lang') || 'en'; } catch { /* storage blocked */ }
  render(lang);
  document.getElementById('langSelect')?.addEventListener('change', e => render(e.target.value));
})();
