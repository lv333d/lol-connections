// Shared helpers for Connections board files (puzzles/YYYY-MM-DD.json). Boards come out weekly; the file date is
// the day a board unlocks (00:00 UTC) and boardId is its week number.
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PUZZLES_DIR = path.join(ROOT, 'puzzles');
export const MANIFEST_PATH = path.join(PUZZLES_DIR, 'index.json');

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const DIFFICULTIES = ['yellow', 'green', 'blue', 'purple'];
export const BOARD_INTERVAL_DAYS = 7;

export const slugify = s => String(s)
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const isLocalized = v => (typeof v === 'string' && v.trim() !== '')
  || (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).some(s => typeof s === 'string' && s.trim()));

/** Returns a list of human-readable problems; empty list means the board is valid. */
export function validateBoard(b) {
  const errs = [];
  if (!b || typeof b !== 'object') return ['Board is not an object'];
  if (!DATE_RE.test(b.date || '')) errs.push('date must be YYYY-MM-DD');
  if (!Number.isInteger(b.boardId) || b.boardId < 1) errs.push('boardId must be a positive integer');
  if (!Array.isArray(b.categories) || b.categories.length !== 4) return [...errs, 'categories must have exactly 4 entries'];

  const seenDifficulty = new Set();
  const seenIds = new Map();
  b.categories.forEach((c, ci) => {
    const where = `category ${ci + 1}`;
    if (!isLocalized(c.title)) errs.push(`${where}: title is empty`);
    if (c.key !== undefined && (typeof c.key !== 'string' || c.key !== slugify(c.key))) errs.push(`${where}: key must be a slug`);
    if (!DIFFICULTIES.includes(c.difficulty)) errs.push(`${where}: invalid difficulty "${c.difficulty}"`);
    else if (seenDifficulty.has(c.difficulty)) errs.push(`${where}: difficulty "${c.difficulty}" used twice`);
    seenDifficulty.add(c.difficulty);
    if (c.explain !== undefined && !isLocalized(c.explain)) errs.push(`${where}: explain is empty`);
    if (!Array.isArray(c.items) || c.items.length !== 4) { errs.push(`${where}: items must have exactly 4 entries`); return; }
    c.items.forEach((it, ii) => {
      const w = `${where}, item ${ii + 1}`;
      if (!it.id || it.id !== slugify(it.id)) errs.push(`${w}: id must be a non-empty slug`);
      if (!isLocalized(it.name)) errs.push(`${w}: name is empty`);
      if (seenIds.has(it.id)) errs.push(`${w}: id "${it.id}" already used in category ${seenIds.get(it.id) + 1}`);
      seenIds.set(it.id, ci);
    });
  });
  return errs;
}

export const boardPath = date => path.join(PUZZLES_DIR, `${date}.json`);

export async function readBoard(date) {
  return JSON.parse(await readFile(boardPath(date), 'utf8'));
}

export async function listBoardDates() {
  try {
    return (await readdir(PUZZLES_DIR))
      .map(f => f.replace(/\.json$/, ''))
      .filter(d => DATE_RE.test(d))
      .sort();
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

export async function writeBoard(board) {
  const errs = validateBoard(board);
  if (errs.length) throw Object.assign(new Error(errs.join('; ')), { validation: errs });
  await mkdir(PUZZLES_DIR, { recursive: true });
  await writeFile(boardPath(board.date), JSON.stringify(board, null, 2) + '\n', 'utf8');
  await rebuildManifest();
}

export async function rebuildManifest() {
  const boards = [];
  for (const date of await listBoardDates()) {
    const b = await readBoard(date);
    boards.push({ date, boardId: b.boardId });
  }
  await writeFile(MANIFEST_PATH, JSON.stringify({ boards }, null, 2) + '\n', 'utf8');
  return boards;
}

/**
 * Keeps board numbers (week N, shown in the game and shared results) consecutive in date order: week 1 is the earliest.
 * Past boards can be moved and deleted too, so every board is renumbered (player progress is keyed by date, not id).
 */
export async function renumberBoards() {
  let next = 1;
  for (const date of await listBoardDates()) {
    const b = await readBoard(date);
    if (b.boardId !== next) await writeFile(boardPath(date), JSON.stringify({ ...b, boardId: next }, null, 2) + '\n', 'utf8');
    next++;
  }
  return rebuildManifest();
}

/** Moves a board to another date; if that date already has a board, the two swap dates. */
export async function moveBoard(from, to) {
  const a = await readBoard(from);
  const b = await readBoard(to).catch(() => null);
  await writeFile(boardPath(to), JSON.stringify({ ...a, date: to }, null, 2) + '\n', 'utf8');
  if (b) await writeFile(boardPath(from), JSON.stringify({ ...b, date: from }, null, 2) + '\n', 'utf8');
  else await unlink(boardPath(from));
  await renumberBoards();
  return { swapped: Boolean(b) };
}

/** Next free boardId: one more than the highest existing id. */
export async function nextBoardId() {
  let max = 0;
  for (const date of await listBoardDates()) max = Math.max(max, (await readBoard(date)).boardId || 0);
  return max + 1;
}
