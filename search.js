/* Player search shared by the three games (guess.js, path.js, grid.js). Order of the results:
     0 the nick itself, 1 nicks that start with the text, 2 nicks that contain it,
     3 a word of the real name that starts with it ("lee" → Lee Sang-hyeok; never the middle of a word:
       "fak" must not find Arif Akin, whose name without spaces reads "arifakin"),
     4 typos — only when nothing above matched and the text has 4+ characters: a nick (or its beginning) one edit
       away (two from 7 characters: a missing, extra, wrong or swapped letter), so "fakr" finds Faker but a
       different word never shows up.
   Within a tier the better-known player comes first (`score`, higher first), then the nick A–Z.
   players-index.json also lists { id, alias } for ids merged into another record (data/player-merge.json):
   prepare() leaves them out of the search and canon() turns them into the kept id, so old saves still work. */
const PLAYER_SEARCH = (() => {
  const strip = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const normalize = s => strip(s).replace(/[^a-z0-9가-힣一-龥]/g, '');
  const words = s => strip(s).split(/[^a-z0-9가-힣一-龥]+/).filter(Boolean);

  /** Optimal string alignment distance, stopped early once it exceeds `max`. */
  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
        cur.push(d);
        best = Math.min(best, d);
      }
      if (best > max) return max + 1;
      prev2 = prev;
      prev = cur;
    }
    return prev[b.length];
  }

  /** The search list from a player list: { players, byId (merged ids too), canon(id) }. */
  function prepare(list) {
    const entries = Array.isArray(list) ? list : [];
    const alias = new Map(entries.filter(p => p && p.alias).map(p => [p.id, p.alias]));
    const players = entries.filter(p => p && !p.alias && p.id && p.nick)
      .map(p => ({ ...p, n: normalize(p.nick), nw: words(p.name), nm: normalize(p.name) }));
    const byId = new Map(players.map(p => [p.id, p]));
    const canon = id => (alias.has(id) && byId.has(alias.get(id)) ? alias.get(id) : id);
    for (const [id] of alias) if (byId.has(canon(id))) byId.set(id, byId.get(canon(id)));
    return { players, byId, canon };
  }

  function find(players, query, { limit = 30, score = p => p.t || 0 } = {}) {
    const q = normalize(query);
    if (!q) return [];
    const ranked = [];
    for (const p of players) {
      let rank = -1;
      if (p.n === q) rank = 0;
      else if (p.n.startsWith(q)) rank = 1;
      else if (p.n.includes(q)) rank = 2;
      else if (p.nw.some(w => w.startsWith(q)) || (q.length > 3 && p.nm.startsWith(q))) rank = 3;
      if (rank >= 0) ranked.push([rank, p]);
    }
    if (!ranked.length && q.length >= 4) {
      const max = q.length >= 7 ? 2 : 1;
      for (const p of players) {
        const d = Math.min(distance(q, p.n, max), p.n.length > q.length ? distance(q, p.n.slice(0, q.length), max) : max + 1);
        if (d <= max) ranked.push([4 + d, p]);
      }
    }
    ranked.sort((a, b) => a[0] - b[0] || score(b[1]) - score(a[1]) || a[1].nick.localeCompare(b[1].nick));
    return ranked.slice(0, limit).map(x => x[1]);
  }

  return { normalize, prepare, find, distance };
})();
