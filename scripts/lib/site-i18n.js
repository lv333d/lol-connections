// Per-language page texts that live only in the HTML (meta tags). The game UI strings stay
// in grid.js / guess.js (I18N) — scripts/lib/site-pages.js reads them from there.
// Every page has its own title (<title>, og:title, twitter:title) in its language: the game's name as in the
// tabs (Guess the Pro, Career Path, Grid — the same in every language) + a short translated line + "LoL Connect";
// English keeps the plain "<game> — LoL Connect". imageAlt describes the game's own link-preview picture
// (assets/og/<page>-<lang>.png, scripts/make-og-images.js).

export const LANGS = ['en', 'pl', 'es', 'fr']; // en first: it is served at / and is the x-default
export const OG_LOCALE = { en: 'en_US', pl: 'pl_PL', es: 'es_ES', fr: 'fr_FR' };

export const META = {
  grid: {
    en: {
      desc: 'Daily League of Legends esports puzzles: name the pro players who fit each row and column of the 3x3 grid, plus a daily Guess the Pro.',
      title: 'Grid — LoL Connect',
      ogTitle: 'Grid — LoL Connect',
      imageAlt: 'Grid 3×3 — find a pro player for every row and column · connect4.lol',
      ogDesc: 'Find a pro player who meets both the row and the column condition, or guess the daily pro player from the clues.'
    },
    pl: {
      desc: 'Zagadki League of Legends: codzienna siatka 3x3 pro-graczy i codzienne Guess the Pro.',
      title: 'Grid: siatka 3×3 pro-graczy — LoL Connect',
      ogTitle: 'Grid: siatka 3×3 pro-graczy — LoL Connect',
      imageAlt: 'Grid 3×3 — znajdź pro-gracza do każdego wiersza i kolumny · connect4.lol',
      ogDesc: 'Znajdź pro-gracza, który spełnia warunek wiersza i kolumny, albo zgadnij gracza dnia po podpowiedziach.'
    },
    es: {
      desc: 'Acertijos diarios de esports de League of Legends: encuentra a los jugadores profesionales que cumplen cada fila y columna de la cuadrícula 3x3, y un Guess the Pro diario.',
      title: 'Grid: cuadrícula 3×3 de jugadores pro — LoL Connect',
      ogTitle: 'Grid: cuadrícula 3×3 de jugadores pro — LoL Connect',
      imageAlt: 'Grid 3×3 — encuentra un jugador pro para cada fila y columna · connect4.lol',
      ogDesc: 'Encuentra a un jugador profesional que cumpla la condición de la fila y la de la columna, o adivina el jugador del día con las pistas.'
    },
    fr: {
      desc: 'Énigmes quotidiennes sur l\'esport League of Legends : trouvez les joueurs pros qui remplissent chaque ligne et colonne de la grille 3x3, plus un Guess the Pro quotidien.',
      title: 'Grid : grille 3×3 de joueurs pros — LoL Connect',
      ogTitle: 'Grid : grille 3×3 de joueurs pros — LoL Connect',
      imageAlt: 'Grid 3×3 — trouvez un joueur pro pour chaque ligne et colonne · connect4.lol',
      ogDesc: 'Trouvez un joueur pro qui remplit la condition de la ligne et celle de la colonne, ou devinez le joueur du jour grâce aux indices.'
    }
  },
  guess: {
    en: {
      desc: 'Guess the daily League of Legends pro player. Each guess shows what they share with the answer: nationality, league, team, international titles, debut year and whether they played together.',
      title: 'Guess the Pro — LoL Connect',
      ogTitle: 'Guess the Pro — LoL Connect',
      imageAlt: 'Guess the Pro — guess the League of Legends pro player of the day · connect4.lol',
      ogDesc: 'Guess the daily League of Legends pro player.'
    },
    pl: {
      desc: 'Zgadnij codziennego pro-gracza League of Legends. Każdy typ pokazuje, co ma wspólnego z szukanym: narodowość, ligę, drużynę, trofea międzynarodowe, rok debiutu i to, czy grali razem.',
      title: 'Guess the Pro: zgadnij pro-gracza dnia — LoL Connect',
      ogTitle: 'Guess the Pro: zgadnij pro-gracza dnia — LoL Connect',
      imageAlt: 'Guess the Pro — zgadnij codziennego pro-gracza League of Legends · connect4.lol',
      ogDesc: 'Zgadnij codziennego pro-gracza League of Legends.'
    },
    es: {
      desc: 'Adivina el jugador pro diario de League of Legends. Cada intento muestra lo que comparte con la respuesta: nacionalidad, liga, equipo, títulos internacionales, año de debut y si jugaron juntos.',
      title: 'Guess the Pro: adivina el jugador pro del día — LoL Connect',
      ogTitle: 'Guess the Pro: adivina el jugador pro del día — LoL Connect',
      imageAlt: 'Guess the Pro — adivina el jugador pro de League of Legends del día · connect4.lol',
      ogDesc: 'Adivina el jugador pro diario de League of Legends.'
    },
    fr: {
      desc: 'Devinez le joueur pro League of Legends du jour. Chaque essai montre ce qu\'il partage avec la réponse : nationalité, ligue, équipe, titres internationaux, année de débuts et s\'ils ont joué ensemble.',
      title: 'Guess the Pro : devinez le joueur pro du jour — LoL Connect',
      ogTitle: 'Guess the Pro : devinez le joueur pro du jour — LoL Connect',
      imageAlt: 'Guess the Pro — devinez le joueur pro de League of Legends du jour · connect4.lol',
      ogDesc: 'Devinez le joueur pro League of Legends du jour.'
    }
  },
  path: {
    en: {
      desc: 'Guess the daily League of Legends pro player from their career path: the teams they played for, in order, revealed one by one.',
      title: 'Career Path — LoL Connect',
      ogTitle: 'Career Path — LoL Connect',
      imageAlt: 'Career Path — name the pro player from the teams of their career · connect4.lol',
      ogDesc: 'Name the pro player from the teams of their career.'
    },
    pl: {
      desc: 'Zgadnij codziennego pro-gracza League of Legends po jego ścieżce kariery: drużynach, w których grał, po kolei, odkrywanych jedna po drugiej.',
      title: 'Career Path: zgadnij gracza po drużynach — LoL Connect',
      ogTitle: 'Career Path: zgadnij gracza po drużynach — LoL Connect',
      imageAlt: 'Career Path — zgadnij pro-gracza po drużynach z jego kariery · connect4.lol',
      ogDesc: 'Zgadnij pro-gracza po drużynach z jego kariery.'
    },
    es: {
      desc: 'Adivina el jugador pro diario de League of Legends por su trayectoria: los equipos en los que jugó, en orden, descubiertos uno a uno.',
      title: 'Career Path: adivina el jugador por sus equipos — LoL Connect',
      ogTitle: 'Career Path: adivina el jugador por sus equipos — LoL Connect',
      imageAlt: 'Career Path — adivina el jugador pro por los equipos de su carrera · connect4.lol',
      ogDesc: 'Adivina el jugador pro por los equipos de su carrera.'
    },
    fr: {
      desc: 'Devinez le joueur pro League of Legends du jour grâce à son parcours : les équipes où il a joué, dans l’ordre, dévoilées une à une.',
      title: 'Career Path : trouvez le joueur par ses équipes — LoL Connect',
      ogTitle: 'Career Path : trouvez le joueur par ses équipes — LoL Connect',
      imageAlt: 'Career Path — trouvez le joueur pro grâce aux équipes de sa carrière · connect4.lol',
      ogDesc: 'Trouvez le joueur pro grâce aux équipes de sa carrière.'
    }
  }
};
