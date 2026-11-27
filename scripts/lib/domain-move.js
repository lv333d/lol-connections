// Moving from connect4.lol to lolconnect.net without losing anyone's streak (phase 1, until 2026-12-04).
// Game saves, streaks and settings live in localStorage, which belongs to one domain: a plain 301 would land players
// on the new domain with nothing saved. So, while both domains serve this same build, the first script in <head>
// (put there by scripts/lib/site-pages.js and scripts/build-site.js) does this:
//  - on connect4.lol: reads the saves (game states, device id, visit days, language, guide seen, umami.disabled) and
//    goes to the same address on lolconnect.net with them in the URL fragment (#lolc-import=…, never sent to a server);
//  - on lolconnect.net: imports the fragment before anything else runs, then removes it from the address. A day
//    already played here is kept unless only the imported copy is finished; visit days and "guide seen" are merged;
//    the device id comes from the old domain (the "players today" counter doesn't count anyone twice).
// Synchronous on purpose (no compression): the language redirect and the games run after it with the data in place.
// Phase 2: connect4.lol gets a permanent redirect in Vercel (Domains) and this script has nothing left to do.
export const NEW_ORIGIN = 'https://lolconnect.net';

export const MOVE_SCRIPT = `<script>
  /* Domain move connect4.lol → lolconnect.net (scripts/lib/domain-move.js). */
  (function () {
    var NEW = '${NEW_ORIGIN}', OLD = /^(www\\.)?connect4\\.lol$/, TAG = '#lolc-import=';
    var SAVE = /^(lolg|lolgp|lolpa)_state_\\d{4}-\\d{2}-\\d{2}$/, ONE = ['lolc_device', 'lolc_visits', 'lolc_lang', 'lolc_onboarded', 'umami.disabled'];
    try {
      if (OLD.test(location.hostname)) {
        var d = {}, n = 0;
        try {
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (SAVE.test(k) || ONE.indexOf(k) >= 0) { d[k] = localStorage.getItem(k); n++; }
          }
        } catch (e) { /* storage blocked: move without data */ }
        var data = n ? btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, d: d })))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '') : '';
        window.__lolcMoving = true; // the language redirect below must not cancel this one
        document.documentElement.style.display = 'none';
        location.replace(NEW + location.pathname + location.search + (data ? TAG + data : location.hash));
        return;
      }
      if (location.hash.indexOf(TAG) !== 0) return;
      var raw = location.hash.slice(TAG.length).replace(/-/g, '+').replace(/_/g, '/');
      history.replaceState(history.state, '', location.pathname + location.search);
      var got = JSON.parse(decodeURIComponent(escape(atob(raw)))).d || {};
      var parse = function (s) { try { return JSON.parse(s); } catch (e) { return null; } };
      Object.keys(got).forEach(function (k) {
        var mine = localStorage.getItem(k), theirs = got[k];
        if (typeof theirs !== 'string' || !(SAVE.test(k) || ONE.indexOf(k) >= 0)) return;
        if (k === 'lolc_device' || mine === null) { localStorage.setItem(k, theirs); return; }
        if (SAVE.test(k)) {
          var a = parse(mine), b = parse(theirs);
          if (b && b.gameOver === true && !(a && a.gameOver === true)) localStorage.setItem(k, theirs);
        } else if (k === 'lolc_visits' || k === 'lolc_onboarded') {
          var x = parse(mine) || {}, y = parse(theirs) || {};
          Object.keys(y).forEach(function (g) {
            if (Array.isArray(y[g])) x[g] = (Array.isArray(x[g]) ? x[g] : []).concat(y[g]).filter(function (v, i, all) { return all.indexOf(v) === i; }).sort();
            else if (!(g in x)) x[g] = y[g];
          });
          localStorage.setItem(k, JSON.stringify(x));
        }
      });
    } catch (e) { /* a broken or cut link: the site just starts without the old saves */ }
  })();
  </script>`;

/** The move script as the first thing in <head>. */
export const withMoveScript = html => html.replace(/<head>/, '<head>\n  ' + MOVE_SCRIPT);
