/* Data contracts shared by the game (app.js, grid.js), the admin panel and scripts/. */

export type Lang = 'pl' | 'en' | 'es' | 'fr';

/** Plain string (same in every language) or per-language map; missing languages fall back to en → pl. */
export type Localized = string | Partial<Record<Lang, string>>;

/* ---------- Connections (puzzles/YYYY-MM-DD.json, one board per week) ---------- */

export type Difficulty = 'yellow' | 'green' | 'blue' | 'purple';

export interface ConnectionsItem {
  /** Stable slug of the player's nickname. */
  id: string;
  /** The nickname; never localized. */
  name: Localized;
}

export interface ConnectionsCategory {
  /** Source category in data/connections-categories.json (e.g. "msi-multi"); lets the generator avoid repeats. */
  key?: string;
  title: Localized;
  difficulty: Difficulty;
  /** Exactly 4 items. */
  items: ConnectionsItem[];
  explain?: Localized;
}

export interface ConnectionsBoard {
  /** YYYY-MM-DD, equals the file name: the board unlocks at 00:00 UTC that day. */
  date: string;
  /** Week number: 1 for the earliest board, consecutive in date order. */
  boardId: number;
  /** Exactly 4 categories. Order matters: saved game state references tiles by category index. */
  categories: ConnectionsCategory[];
  suggestedBy?: string;
}

/** puzzles/index.json — static hosting cannot list a directory, so the archive reads this. */
export interface PuzzleManifest {
  boards: { date: string; boardId: number }[];
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
  | { kind: 'nationality'; /** ISO 3166-1 alpha-2, lower-case, e.g. "kr" */ id: string }
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
export interface Team { id: string; name: string; short: string; logo: string;
  /** Home league: the one most of its player-tournaments were in ('' when none of the five). */ league: string; aliases: string[] }

/** data/players.json — full database, used only by scripts (generator, fetch-assets). */
export interface Player {
  id: string;
  nick: string;
  /** Romanized real name, e.g. "Lee Sang-hyeok". */
  name: string;
  /** Leaguepedia page title, used by fetch-assets. */
  wikiPage: string;
  retired: boolean;
  /** Has been listed as a coach (most also played; see coachOnly). */
  coach: boolean;
  /** Only ever a coach (e.g. BigWei); teams, leagues and trophies count coaching too. */
  coachOnly?: boolean;
  /** ISO 3166-1 alpha-2 code (lower-case), '' when Leaguepedia has none. */
  nationality: string;
  /** Team (franchise) ids played for or coached. */
  teams: string[];
  /** League ids played or coached in: LCK, LPL, LEC, LCS, LTA. */
  leagues: string[];
  /** Won as a player or as the coach of the winning roster. */
  trophies: Trophy[];
  /** Ids that shared a roster (as players or coaches) in at least one tournament. */
  teammates: string[];
  /** Number of tournaments played or coached — a popularity proxy for picking teammate anchors. */
  tournaments: number;
}
