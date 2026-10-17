// One-off migration: puzzles.json (single file, legacy schema) → puzzles/YYYY-MM-DD.json + puzzles/index.json.
// Usage: node scripts/migrate-puzzles.js [--file=legacy.json] [--ingame=2026-10-11,2026-10-20]
//   --file    legacy file to read (default: puzzles.json; the admin panel can export old localStorage drafts)
//   --ingame  dates whose boards are about in-game items (mode "ingame", item type "item");
//             everything else is migrated as mode "esport" with item type "player".
// Existing boards with the same date are overwritten; new dates get the next free boardId.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, DATE_RE, slugify, writeBoard, validateBoard, readBoard, nextBoardId } from './lib/puzzles.js';

// Legacy `color` index → difficulty, chosen so existing boards keep their on-screen colours.
const COLOR_TO_DIFFICULTY = ['green', 'yellow', 'blue', 'purple'];
const LANGS = ['pl', 'en', 'es', 'fr'];

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const ingameDates = new Set(arg('ingame')?.split(',') || []);
const sourceFile = path.resolve(ROOT, arg('file') || 'puzzles.json');

const toLocalized = v => (typeof v === 'string' ? { pl: v } : { ...v });

/** Collapse { pl: 'X', en: 'X', ... } into 'X' when every language is identical. */
function collapse(loc) {
  const vals = Object.values(loc).filter(Boolean);
  return vals.length && vals.every(v => v === vals[0]) ? vals[0] : loc;
}

function migrateBoard(date, legacy, boardId) {
  const mode = ingameDates.has(date) ? 'ingame' : 'esport';
  const type = mode === 'ingame' ? 'item' : 'player';
  const usedIds = new Set();
  const warnings = [];

  const categories = legacy.groups.map(g => {
    const itemsByLang = Array.isArray(g.items) ? { pl: g.items } : g.items;
    const base = itemsByLang.pl || itemsByLang.en || Object.values(itemsByLang)[0];
    const items = base.map((plName, i) => {
      const name = {};
      LANGS.forEach(l => { if (itemsByLang[l]?.[i]) name[l] = itemsByLang[l][i]; });
      let id = slugify(itemsByLang.en?.[i] || plName);
      if (usedIds.has(id)) {
        warnings.push(`"${plName}" appears in more than one category — renamed id to "${id}-2"`);
        id = `${id}-2`;
      }
      usedIds.add(id);
      return { id, name: collapse(name), type };
    });
    return {
      title: collapse(toLocalized(g.category)),
      difficulty: COLOR_TO_DIFFICULTY[g.color] ?? COLOR_TO_DIFFICULTY[0],
      items,
      ...(g.explain ? { explain: collapse(toLocalized(g.explain)) } : {})
    };
  });

  const board = { date, boardId, mode, categories, ...(legacy.suggestedBy ? { suggestedBy: legacy.suggestedBy } : {}) };
  return { board, warnings };
}

const legacy = JSON.parse(await readFile(sourceFile, 'utf8'));
const dates = Object.keys(legacy).filter(d => DATE_RE.test(d)).sort();
let failed = 0;

for (const date of dates) {
  const boardId = await readBoard(date).then(b => b.boardId, () => nextBoardId());
  const { board, warnings } = migrateBoard(date, legacy[date], boardId);
  warnings.forEach(w => console.warn(`⚠ ${date}: ${w}`));
  const errs = validateBoard(board);
  if (errs.length) {
    failed++;
    console.error(`✗ ${date}:\n  ${errs.join('\n  ')}`);
    continue;
  }
  await writeBoard(board);
  console.log(`✓ ${date}  #${board.boardId}  ${board.mode}`);
}

console.log(`\nMigrated ${dates.length - failed}/${dates.length} boards into puzzles/.`);
if (failed) process.exitCode = 1;
