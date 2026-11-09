// Per-language page texts that live only in the HTML (meta tags). The game UI strings stay
// in grid.js / app.js (I18N) — scripts/lib/site-pages.js reads them from there.
// Page titles are the site's own ("LoL Connect", "Connections — LoL Connect") in every language.

export const LANGS = ['en', 'pl', 'es', 'fr']; // en first: it is served at / and is the x-default
export const OG_LOCALE = { en: 'en_US', pl: 'pl_PL', es: 'es_ES', fr: 'fr_FR' };

export const META = {
  grid: {
    en: {
      desc: 'Daily League of Legends esports puzzles: name the pro players who fit each row and column of the 3x3 grid, plus a weekly Connections puzzle.',
      ogTitle: 'LoL Connect — Daily League of Legends esports puzzles',
      ogDesc: 'Find a pro player who meets both the row and the column condition, or sort 16 items into 4 groups.'
    },
    pl: {
      desc: 'Zagadki League of Legends: codzienna siatka 3x3 pro-graczy i cotygodniowe Connections.',
      ogTitle: 'LoL Connect — Codzienne zagadki League of Legends',
      ogDesc: 'Znajdź pro-gracza, który spełnia warunek wiersza i kolumny, albo pogrupuj 16 haseł w 4 kategorie.'
    },
    es: {
      desc: 'Acertijos diarios de esports de League of Legends: encuentra a los jugadores profesionales que cumplen cada fila y columna de la cuadrícula 3x3, y un Connections semanal.',
      ogTitle: 'LoL Connect — Acertijos diarios de esports de League of Legends',
      ogDesc: 'Encuentra a un jugador profesional que cumpla la condición de la fila y la de la columna, o agrupa 16 elementos en 4 categorías.'
    },
    fr: {
      desc: 'Énigmes quotidiennes sur l\'esport League of Legends : trouvez les joueurs pros qui remplissent chaque ligne et colonne de la grille 3x3, plus un Connections hebdomadaire.',
      ogTitle: 'LoL Connect — Énigmes quotidiennes d\'esport League of Legends',
      ogDesc: 'Trouvez un joueur pro qui remplit la condition de la ligne et celle de la colonne, ou classez 16 éléments en 4 catégories.'
    }
  },
  connections: {
    en: {
      desc: 'A weekly League of Legends word puzzle inspired by Connections. Sort 16 related items into 4 groups!',
      ogTitle: 'LoL Connect — Weekly League of Legends puzzle'
    },
    pl: {
      desc: 'Cotygodniowa słowna zagadka League of Legends inspirowana Connections. Dopasuj powiązane elementy w 4 kategorie!',
      ogTitle: 'LoL Connect — Cotygodniowa zagadka League of Legends'
    },
    es: {
      desc: 'Un acertijo semanal de League of Legends inspirado en Connections. ¡Agrupa 16 elementos relacionados en 4 categorías!',
      ogTitle: 'LoL Connect — Acertijo semanal de League of Legends'
    },
    fr: {
      desc: 'Une énigme hebdomadaire League of Legends inspirée de Connections. Classez 16 éléments liés en 4 catégories !',
      ogTitle: 'LoL Connect — Énigme hebdomadaire League of Legends'
    }
  }
};

