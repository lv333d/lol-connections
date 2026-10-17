// Minimal Leaguepedia (lol.fandom.com) MediaWiki client: bot-password login, throttled Cargo queries
// with retry on rate limits, image URL lookup, and an on-disk response cache (.cache/leaguepedia).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from './puzzles.js';

try { process.loadEnvFile(path.join(ROOT, '.env.local')); } catch { /* optional */ }

const API = 'https://lol.fandom.com/api.php';
const USER_AGENT = 'LoLConnectBot/1.0 (https://connect4.lol; data import for a fan puzzle game)';
const CACHE_DIR = path.join(ROOT, '.cache', 'leaguepedia');
const MAX_INTERVAL_MS = 15_000;
const MAX_RETRIES = 6;
const CARGO_PAGE = 500;

const cookies = new Map();
let lastRequestAt = 0;
let loggedInAs = null;
// Grows after every rate-limit hit so a long import settles at a pace the server accepts.
let minIntervalMs = 2000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function request(params, { method = 'GET' } = {}) {
  const wait = lastRequestAt + minIntervalMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const body = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const url = method === 'GET' ? `${API}?${body}` : API;
  const res = await fetch(url, {
    method,
    headers: {
      'User-Agent': USER_AGENT,
      ...(cookies.size ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
    },
    body: method === 'POST' ? body : undefined
  });
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
  if (!res.ok) throw new Error(`Leaguepedia HTTP ${res.status}`);
  return res.json();
}

/** Logs in with LEAGUEPEDIA_BOT_USER / LEAGUEPEDIA_BOT_PASSWORD; no-op (anonymous) when they are missing. */
export async function login() {
  if (loggedInAs) return loggedInAs;
  const user = process.env.LEAGUEPEDIA_BOT_USER;
  const pass = process.env.LEAGUEPEDIA_BOT_PASSWORD;
  if (!user || !pass) {
    console.warn('⚠ Brak LEAGUEPEDIA_BOT_USER/LEAGUEPEDIA_BOT_PASSWORD w .env.local — zapytania anonimowe (silnie limitowane).');
    return null;
  }
  const tok = await request({ action: 'query', meta: 'tokens', type: 'login' });
  const res = await request({ action: 'login', lgname: user, lgpassword: pass, lgtoken: tok.query.tokens.logintoken }, { method: 'POST' });
  if (res.login?.result !== 'Success') {
    throw new Error(`Logowanie do Leaguepedii nieudane: ${res.login?.result} ${res.login?.reason || ''}`.trim());
  }
  loggedInAs = res.login.lgusername;
  return loggedInAs;
}

async function withRetry(params, method) {
  for (let attempt = 0; ; attempt++) {
    const data = await request(params, { method });
    if (!data.error) return data;
    if (data.error.code !== 'ratelimited' || attempt >= MAX_RETRIES) {
      throw new Error(`Leaguepedia API: ${data.error.code} — ${data.error.info}`);
    }
    minIntervalMs = Math.min(MAX_INTERVAL_MS, Math.round(minIntervalMs * 1.5));
    const backoff = Math.min(120_000, 10_000 * 2 ** attempt);
    console.warn(`  ratelimited, czekam ${backoff / 1000}s (próba ${attempt + 1}/${MAX_RETRIES}; odstęp między zapytaniami: ${minIntervalMs / 1000}s)`);
    await sleep(backoff);
  }
}

async function cached(key, fn) {
  const file = path.join(CACHE_DIR, createHash('sha1').update(key).digest('hex') + '.json');
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { /* miss */ }
  const value = await fn();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(value));
  return value;
}

/**
 * Runs a Cargo query and follows pagination. Field aliases ("T.Name=Tournament") become row keys.
 * Every result page is cached on disk, so an interrupted import resumes where it stopped;
 * pass { fresh: true } to bypass the cache.
 * @returns {Promise<Record<string, string>[]>}
 */
export async function cargoQuery({ tables, fields, where = '', joinOn = '', groupBy = '', orderBy = '', fresh = false }) {
  const base = { action: 'cargoquery', tables, fields, where, join_on: joinOn, group_by: groupBy, order_by: orderBy, limit: String(CARGO_PAGE) };
  const rows = [];
  for (let offset = 0; ; offset += CARGO_PAGE) {
    const params = { ...base, offset: String(offset) };
    const fetchPage = async () => {
      await login();
      // POST keeps long WHERE clauses out of the URL length limit.
      const data = await withRetry(params, 'POST');
      return (data.cargoquery || []).map(r => r.title);
    };
    const page = fresh ? await fetchPage() : await cached(JSON.stringify(params), fetchPage);
    rows.push(...page);
    if (page.length < CARGO_PAGE) return rows;
  }
}

/** File names (without "File:") → direct image URLs, 50 per request. Missing files are omitted. */
export async function imageUrls(fileNames) {
  const out = new Map();
  for (let i = 0; i < fileNames.length; i += 50) {
    const batch = fileNames.slice(i, i + 50);
    const data = await withRetry({ action: 'query', prop: 'imageinfo', iiprop: 'url', titles: batch.map(f => 'File:' + f).join('|') }, 'GET');
    const normalized = new Map((data.query?.normalized || []).map(n => [n.to, n.from]));
    for (const p of data.query?.pages || []) {
      const url = p.imageinfo?.[0]?.url;
      if (url) out.set((normalized.get(p.title) || p.title).replace(/^File:/, ''), url);
    }
  }
  return out;
}

/** Escapes a value for use inside a single-quoted Cargo WHERE literal. */
export const cargoStr = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export const fetchBinary = async url => {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
};
