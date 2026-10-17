/* Data contracts shared by the game (app.js, grid.js), the admin panel and scripts/. */

export type Lang = 'pl' | 'en' | 'es' | 'fr';

/** Plain string (same in every language) or per-language map; missing languages fall back to en → pl. */
export type Localized = string | Partial<Record<Lang, string>>;

/* ---------- Connections (puzzles/YYYY-MM-DD.json) ---------- */

export type Difficulty = 'yellow' | 'green' | 'blue' | 'purple';
export type ItemType = 'player' | 'champion' | 'item';

export interface ConnectionsItem {
  /** Stable slug; for players it is also the asset name: players/{id}.webp */
  id: string;
  name: Localized;
  type: ItemType;
}

export interface ConnectionsCategory {
  title: Localized;
  difficulty: Difficulty;
  /** Exactly 4 items. */
  items: ConnectionsItem[];
  explain?: Localized;
}

export interface ConnectionsBoard {
  /** YYYY-MM-DD, equals the file name. */
  date: string;
  boardId: number;
  mode: 'esport' | 'ingame';
  /** Exactly 4 categories. Order matters: saved game state references tiles by category index. */
  categories: ConnectionsCategory[];
  suggestedBy?: string;
}

/** puzzles/index.json — static hosting cannot list a directory, so the archive reads this. */
export interface PuzzleManifest {
  boards: { date: string; boardId: number; mode: ConnectionsBoard['mode'] }[];
}

/* ---------- LoL Grid 3x3 (grid/YYYY-MM-DD.json) ---------- */

export type Trophy = 'worlds' | 'msi' | 'first-stand';

export type Condition =
  | { kind: 'league'; id: string }
  | { kind: 'team'; id: string; /** display name, e.g. "G2 Esports" */ label: string; short: string;
      /** former / sister names that count as the same organization, e.g. ["Gamers2"] */ aliases?: string[] }
  | { kind: 'coach' }
  | { kind: 'retired' }
  | { kind: 'trophy'; id: Trophy }
  | { kind: 'teammate'; playerId: string; /** the anchor's nickname */ label: string };

export interface GridBoard {
  date: string;
  boardId: number;
  rows: [Condition, Condition, Condition];
  cols: [Condition, Condition, Condition];
  /** Valid player ids per cell [row][col], computed by the generator (the client validates guesses against it). */
  answers: string[][][];
}

/* ---------- Player database (built by scripts/build-player-db.js) ---------- */

/** data/players-index.json — slim list loaded by the browser for the search modal. */
export interface PlayerIndexEntry { id: string; nick: string; name: string; /** tournaments played — search ranking */ t: number }

/** data/teams.json — franchises (renames such as SK Telecom T1 → T1 are merged). */
export interface Team { id: string; name: string; short: string; logo: string; aliases: string[] }

/** data/players.json — full database, used only by scripts (generator, fetch-assets). */
export interface Player {
  id: string;
  nick: string;
  /** Romanized real name, e.g. "Lee Sang-hyeok". */
  name: string;
  /** Leaguepedia page title, used by fetch-assets. */
  wikiPage: string;
  retired: boolean;
  /** Played professionally and has also been listed as a coach. */
  coach: boolean;
  /** Team (franchise) ids played for, as a player. */
  teams: string[];
  /** League ids played in: LCK, LPL, LEC, LCS, LTA. */
  leagues: string[];
  trophies: Trophy[];
  /** Player ids that shared a roster in at least one tournament. */
  teammates: string[];
  /** Number of tournaments played — a popularity proxy for picking teammate anchors. */
  tournaments: number;
}
