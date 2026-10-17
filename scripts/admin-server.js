// Local-only admin server: serves the site and an API that writes puzzles/*.json and proxies Gemini.
// Usage: npm run admin   →   http://127.0.0.1:4321/admin.html
// Reads GEMINI_API_KEY / GEMINI_MODEL / ADMIN_PORT from .env.local. Binds to 127.0.0.1 only — never deploy this.
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  ROOT, DATE_RE, boardPath, readBoard, writeBoard, rebuildManifest, nextBoardId, validateBoard,
  moveBoard, renumberBoards
} from './lib/puzzles.js';

try { process.loadEnvFile(path.join(ROOT, '.env.local')); } catch { /* optional */ }

const PORT = Number(process.env.ADMIN_PORT) || 4321;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_BODY = 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};
const BLOCKED_DIRS = new Set(['node_modules', 'scripts', '.cache']);

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(Object.assign(new Error('Invalid JSON body'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

async function serveStatic(req, res, pathname) {
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname).replace(/^\/+/, '');
  const file = path.resolve(ROOT, rel);
  const top = rel.split(/[\\/]/)[0];
  if (!file.startsWith(ROOT + path.sep) || top.startsWith('.') || BLOCKED_DIRS.has(top)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

/* ---------- Gemini translation ---------- */

const LANG_NAMES = { en: 'English', es: 'Spanish', fr: 'French' };

function buildTranslatePrompt(source, targets) {
  return [
    'You translate content for "LoL Connect", a daily League of Legends puzzle game.',
    `Translate the Polish texts below into: ${targets.map(l => LANG_NAMES[l]).join(', ')}.`,
    'Rules:',
    '- Use the official localized League of Legends terminology for each language, exactly as it appears in the',
    '  Riot game client for that locale (item, champion, ability, rune, summoner spell and map names).',
    '- Esports terms follow the convention used by the official broadcasts and Leaguepedia in English',
    '  (e.g. "Worlds", "MSI", "First Stand", "split", "Finals MVP", "role swap", "head coach").',
    '- Never translate player nicknames, team names, league acronyms or tournament names.',
    '- Keep each category title short and punchy, like a puzzle category; keep the meaning exact.',
    '- Return one entry per input entry, in the same order. Use an empty string for empty inputs.',
    '',
    'Input (JSON):',
    JSON.stringify(source)
  ].join('\n');
}

function translateSchema(targets) {
  const langObj = { type: 'OBJECT', properties: Object.fromEntries(targets.map(l => [l, { type: 'STRING' }])), required: targets };
  return {
    type: 'OBJECT',
    properties: {
      categories: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { title: langObj, explain: langObj, items: { type: 'ARRAY', items: langObj } },
          required: ['title', 'explain', 'items']
        }
      }
    },
    required: ['categories']
  };
}

async function translate({ source, targets, apiKey }) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('Brak klucza Gemini (GEMINI_API_KEY w .env.local lub pole w panelu).'), { status: 400 });
  targets = (targets || []).filter(l => LANG_NAMES[l]);
  if (!targets.length || !Array.isArray(source?.categories)) throw Object.assign(new Error('Nieprawidłowe zapytanie.'), { status: 400 });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildTranslatePrompt(source, targets) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: translateSchema(targets) }
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(`Gemini ${r.status}: ${data.error?.message || r.statusText}`), { status: 502 });
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  try { return JSON.parse(text); }
  catch { throw Object.assign(new Error('Gemini zwrócił niepoprawny JSON.'), { status: 502 }); }
}

/* ---------- Publishing (git) ---------- */

const run = promisify(execFile);
// A desktop shortcut inherits Explorer's PATH, which may predate the Git install — fall back to the default location.
const GIT = process.env.GIT_PATH
  || [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'cmd', 'git.exe')].find(p => existsSync(p))
  || 'git';
const git = (...args) => run(GIT, args, { cwd: ROOT, windowsHide: true }).then(r => r.stdout.trim());

/** Board files changed since the last commit: { date, change: 'nowa' | 'zmieniona' | 'usunięta' }. */
async function pendingBoards() {
  const out = await git('status', '--porcelain', '--', 'puzzles/');
  return out.split('\n').filter(Boolean).map(line => {
    const code = line.slice(0, 2);
    const date = line.slice(3).trim().match(/(\d{4}-\d{2}-\d{2})\.json/)?.[1];
    return date && { date, change: code.includes('D') ? 'usunięta' : code.includes('?') || code.includes('A') ? 'nowa' : 'zmieniona' };
  }).filter(Boolean);
}

/** Commits puzzles/ and pushes; the hosting (Vercel) deploys the push automatically. */
async function publish() {
  const boards = await pendingBoards();
  if (!boards.length) return { published: [], message: 'Brak zmian do opublikowania.' };
  await git('add', '--all', '--', 'puzzles/');
  const dates = boards.map(b => b.date).sort();
  await git('commit', '-m', `Connections: ${dates.length === 1 ? dates[0] : `${dates[0]} … ${dates.at(-1)}`} (${dates.length})`);
  try {
    await git('pull', '--rebase', '--autostash'); // the weekly Grid bot may have pushed in the meantime
    await git('push');
  } catch (e) {
    throw Object.assign(new Error('Commit zrobiony, ale wysyłka na GitHuba nie powiodła się: ' + (e.stderr || e.message).trim()), { status: 502 });
  }
  return { published: boards, message: `Opublikowano ${boards.length} plansz(e). Strona zaktualizuje się za ok. minutę.` };
}

/* ---------- API ---------- */

async function handleApi(req, res, pathname) {
  if (pathname === '/api/config' && req.method === 'GET') {
    return send(res, 200, { geminiConfigured: Boolean(process.env.GEMINI_API_KEY), geminiModel: GEMINI_MODEL });
  }
  if (pathname === '/api/publish' && req.method === 'GET') {
    return send(res, 200, { pending: await pendingBoards() });
  }
  if (pathname === '/api/publish' && req.method === 'POST') {
    return send(res, 200, await publish());
  }
  if (pathname === '/api/translate' && req.method === 'POST') {
    return send(res, 200, await translate(await readBody(req)));
  }
  if (pathname === '/api/puzzles' && req.method === 'GET') {
    return send(res, 200, { boards: await rebuildManifest() });
  }

  const mv = pathname.match(/^\/api\/puzzles\/([^/]+)\/move$/);
  if (mv && req.method === 'POST') {
    const from = mv[1];
    const { to } = await readBody(req);
    if (!DATE_RE.test(from) || !DATE_RE.test(to || '')) return send(res, 400, { error: 'Nieprawidłowa data' });
    if (from === to) return send(res, 400, { error: 'To ta sama data' });
    try { await readBoard(from); } catch { return send(res, 404, { error: 'Brak planszy' }); }
    return send(res, 200, await moveBoard(from, to));
  }

  const m = pathname.match(/^\/api\/puzzles\/([^/]+)$/);
  if (m) {
    const date = m[1];
    if (!DATE_RE.test(date)) return send(res, 400, { error: 'Nieprawidłowa data' });

    if (req.method === 'GET') {
      try { return send(res, 200, await readBoard(date)); }
      catch { return send(res, 404, { error: 'Brak planszy' }); }
    }
    if (req.method === 'PUT') {
      const board = { ...(await readBody(req)), date };
      if (!board.boardId) {
        board.boardId = await readBoard(date).then(b => b.boardId, () => nextBoardId());
      }
      const errs = validateBoard(board);
      if (errs.length) return send(res, 422, { error: 'Walidacja nie powiodła się', details: errs });
      await writeBoard(board);
      await renumberBoards();
      return send(res, 200, await readBoard(date));
    }
    if (req.method === 'DELETE') {
      try { await unlink(boardPath(date)); } catch { return send(res, 404, { error: 'Brak planszy' }); }
      await renumberBoards();
      return send(res, 200, { ok: true });
    }
  }
  return send(res, 404, { error: 'Unknown endpoint' });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname.startsWith('/api/')) await handleApi(req, res, pathname);
    else await serveStatic(req, res, pathname);
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, { error: e.message });
  }
});
// Started twice (e.g. the desktop shortcut clicked again): the panel is already up, nothing to do.
server.on('error', e => {
  if (e.code !== 'EADDRINUSE') throw e;
  console.log(`Panel już działa: http://127.0.0.1:${PORT}/admin.html`);
  process.exit(0);
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Admin:  http://127.0.0.1:${PORT}/admin.html`);
  console.log(`Gra:    http://127.0.0.1:${PORT}/`);
  console.log(`Gemini: ${process.env.GEMINI_API_KEY ? 'klucz z .env.local' : 'brak klucza w .env.local'} (model ${GEMINI_MODEL})`);
});
