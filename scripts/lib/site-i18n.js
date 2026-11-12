// Per-language page texts that live only in the HTML (meta tags). The game UI strings stay
// in grid.js / guess.js (I18N) — scripts/lib/site-pages.js reads them from there.
// Page titles are the site's own ("LoL Connect", "Guess the Pro — LoL Connect") in every language.

export const LANGS = ['en', 'pl', 'es', 'fr']; // en first: it is served at / and is the x-default
export const OG_LOCALE = { en: 'en_US', pl: 'pl_PL', es: 'es_ES', fr: 'fr_FR' };

export const META = {
  grid: {
    en: {
      desc: 'Daily League of Legends esports puzzles: name the pro players who fit each row and column of the 3x3 grid, plus a daily Guess the Pro.',
      ogTitle: 'LoL Connect — Daily League of Legends esports puzzles',
      ogDesc: 'Find a pro player who meets both the row and the column condition, or guess the daily pro player from the clues.'
    },
    pl: {
      desc: 'Zagadki League of Legends: codzienna siatka 3x3 pro-graczy i codzienne Guess the Pro.',
      ogTitle: 'LoL Connect — Codzienne zagadki League of Legends',
      ogDesc: 'Znajdź pro-gracza, który spełnia warunek wiersza i kolumny, albo zgadnij gracza dnia po podpowiedziach.'
    },
    es: {
      desc: 'Acertijos diarios de esports de League of Legends: encuentra a los jugadores profesionales que cumplen cada fila y columna de la cuadrícula 3x3, y un Guess the Pro diario.',
      ogTitle: 'LoL Connect — Acertijos diarios de esports de League of Legends',
      ogDesc: 'Encuentra a un jugador profesional que cumpla la condición de la fila y la de la columna, o adivina el jugador del día con las pistas.'
    },
    fr: {
      desc: 'Énigmes quotidiennes sur l\'esport League of Legends : trouvez les joueurs pros qui remplissent chaque ligne et colonne de la grille 3x3, plus un Guess the Pro quotidien.',
      ogTitle: 'LoL Connect — Énigmes quotidiennes d\'esport League of Legends',
      ogDesc: 'Trouvez un joueur pro qui remplit la condition de la ligne et celle de la colonne, ou devinez le joueur du jour grâce aux indices.'
    }
  },
  guess: {
    en: {
      desc: 'Guess the daily League of Legends pro player. Each guess shows what they share with the answer: nationality, league, team, international titles, debut year and whether they played together.',
      ogTitle: 'Guess the Pro — LoL Connect',
      ogDesc: 'Guess the daily League of Legends pro player.'
    },
    pl: {
      desc: 'Zgadnij codziennego pro-gracza League of Legends. Każdy typ pokazuje, co ma wspólnego z szukanym: narodowość, ligę, drużynę, trofea międzynarodowe, rok debiutu i to, czy grali razem.',
      ogTitle: 'Guess the Pro — LoL Connect',
      ogDesc: 'Zgadnij codziennego pro-gracza League of Legends.'
    },
    es: {
      desc: 'Adivina el jugador pro diario de League of Legends. Cada intento muestra lo que comparte con la respuesta: nacionalidad, liga, equipo, títulos internacionales, año de debut y si jugaron juntos.',
      ogTitle: 'Guess the Pro — LoL Connect',
      ogDesc: 'Adivina el jugador pro diario de League of Legends.'
    },
    fr: {
      desc: 'Devinez le joueur pro League of Legends du jour. Chaque essai montre ce qu\'il partage avec la réponse : nationalité, ligue, équipe, titres internationaux, année de débuts et s\'ils ont joué ensemble.',
      ogTitle: 'Guess the Pro — LoL Connect',
      ogDesc: 'Devinez le joueur pro League of Legends du jour.'
    }
  },
};

