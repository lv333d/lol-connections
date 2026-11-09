// Static, per-language HTML for the public site (used by scripts/build-site.js).
// Each template (index.html, connections.html — English in the repo, which the local admin server serves as is)
// becomes /, /pl, /es, /fr (+ /connections) with the language's text already in the HTML: <html lang>, translated
// description and Open Graph tags, canonical + hreflang (x-default = English at /), the game's UI strings
// (data-i18n keys from grid.js / app.js I18N) and the Guide window's content — the same markup the game's
// applyI18n() renders, so nothing changes for players and search engines get the rules without running JS.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { LANGS, OG_LOCALE, META } from './site-i18n.js';

export const SITE = 'https://connect4.lol';
export const PAGES = [
  { id: 'grid', template: 'index.html', slug: '', i18nFrom: 'grid.js' },
  { id: 'connections', template: 'connections.html', slug: 'connections', i18nFrom: 'app.js' }
];

/** Site path of a page in a language: / , /connections, /pl, /pl/connections… (same rule as site.js SITE.path). */
export const pagePath = (lang, slug) => ((lang === 'en' ? '' : '/' + lang) + (slug ? '/' + slug : '')) || '/';
/** Output file in dist/ — cleanUrls serves pl/connections.html at /pl/connections and pl/index.html at /pl. */
export const pageFile = (lang, slug) => path.join(lang === 'en' ? '' : lang, (slug || 'index') + '.html');

const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => escHtml(s).replace(/"/g, '&quot;');

/** The `const I18N = {…};` dictionary of a browser script, evaluated in isolation (no DOM needed). */
async function readI18n(root, file) {
  const src = await readFile(path.join(root, file), 'utf8');
  const start = src.indexOf('const I18N = {');
  const end = src.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error(`Nie znaleziono I18N w ${file}`);
  return vm.runInNewContext('(' + src.slice(start + 'const I18N = '.length, end + 2) + ')');
}

function replaceOnce(html, re, value, what) {
  if (!re.test(html)) throw new Error(`Szablon: brak ${what}`);
  return html.replace(re, value);
}

// Guide window content — keep in sync with applyI18n() in grid.js and app.js. The strings carry intended
// markup (<strong>), as in the game.
const GUIDE = {
  grid: d => d.guide.map(([h, p]) => `<div class="guide-section"><h3>${h}</h3><p>${p}</p></div>`).join(''),
  connections: d => {
    const swatches = ['#3B6E35', '#7A5A10', '#1A4A7A', '#7A1A4A'];
    return `
    <div class="guide-section"><h3>${d.guideWhatTitle}</h3><p>${d.guideWhat}</p></div>
    <div class="guide-section"><h3>${d.guideHowTitle}</h3><ul>${d.guideHow.map(l => `<li>${l}</li>`).join('')}</ul></div>
    <div class="guide-section"><h3>${d.guideColorsTitle}</h3>${d.colorLabels.map((l, i) => `<p><span class="color-swatch" style="background:${swatches[i]}"></span> ${l}</p>`).join('')}</div>
    <div class="guide-section"><h3>${d.guideUniqueTitle}</h3><p>${d.guideUnique}</p></div>
    <div class="guide-section"><h3>${d.guideShareTitle}</h3><p>${d.guideShare}</p></div>
  `;
  }
};

/** All language versions of all pages: [{ file, html, url, lang, page }]. */
export async function buildPages(root) {
  const dicts = { 'grid.js': await readI18n(root, 'grid.js'), 'app.js': await readI18n(root, 'app.js') };
  const out = [];

  for (const page of PAGES) {
    const template = await readFile(path.join(root, page.template), 'utf8');
    for (const lang of LANGS) {
      const url = SITE + pagePath(lang, page.slug);
      const dict = dicts[page.i18nFrom][lang];
      const meta = META[page.id][lang];
      const ogDesc = meta.ogDesc || meta.desc;
      let html = template;

      html = replaceOnce(html, /<html lang="[^"]*">/, `<html lang="${lang}" data-built>`, '<html lang>');
      html = replaceOnce(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(meta.desc)}">`, 'description');
      html = replaceOnce(html, /<link rel="canonical" href="[^"]*">/, [
        `<link rel="canonical" href="${url}">`,
        ...LANGS.map(l => `  <link rel="alternate" hreflang="${l}" href="${SITE + pagePath(l, page.slug)}">`),
        `  <link rel="alternate" hreflang="x-default" href="${SITE + pagePath('en', page.slug)}">`
      ].join('\n'), 'canonical');
      html = replaceOnce(html, /<meta property="og:url" content="[^"]*">/, [
        `<meta property="og:url" content="${url}">`,
        `  <meta property="og:locale" content="${OG_LOCALE[lang]}">`,
        ...LANGS.filter(l => l !== lang).map(l => `  <meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`)
      ].join('\n'), 'og:url');
      html = html.replace(/(<meta (?:property="og|name="twitter):title" content=")[^"]*"/g, `$1${escAttr(meta.ogTitle)}"`)
        .replace(/(<meta (?:property="og|name="twitter):description" content=")[^"]*"/g, `$1${escAttr(ogDesc)}"`);
      html = html.replace(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/, (m, json) => {
        const data = JSON.parse(json);
        for (const node of data['@graph']) {
          if (node['@type'] === 'WebSite') continue;
          Object.assign(node, { url, description: meta.desc, inLanguage: lang });
        }
        return `<script type="application/ld+json">\n  ${JSON.stringify(data).replace(/</g, '\\u003c')}\n  </script>`;
      });

      // Game UI strings and the Guide window, so the page reads right before (and without) JavaScript.
      html = html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g,
        (m, open, tag, key, close) => (typeof dict[key] === 'string' ? open + escHtml(dict[key]) + close : m));
      html = html.replace(/(\bdata-i18n-ph="([^"]+)")/g, (m, attr, key) =>
        (typeof dict[key] === 'string' ? `${attr} placeholder="${escAttr(dict[key])}"` : m));
      html = replaceOnce(html, /<div id="guideContent"><\/div>/, `<div id="guideContent">${GUIDE[page.id](dict)}</div>`, 'guideContent');

      // Links between pages and the language picker stay in this language.
      html = html.replace(/href="\/" class="game-tab/g, `href="${pagePath(lang, '')}" class="game-tab`)
        .replace(/href="\/connections" class="game-tab/g, `href="${pagePath(lang, 'connections')}" class="game-tab`)
        .replace(`<option value="${lang}">`, `<option value="${lang}" selected>`);

      out.push({ file: pageFile(lang, page.slug), html, url, lang, page: page.slug });
    }
  }
  return out;
}

/** sitemap.xml with every language version of every page linked to each other (hreflang). */
export function sitemap(pages, today) {
  const bySlug = new Map();
  for (const p of pages) bySlug.set(p.page, [...(bySlug.get(p.page) || []), p]);
  const urls = pages.map(p => {
    const alts = bySlug.get(p.page).map(a => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.url}"/>`);
    alts.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE + pagePath('en', p.page)}"/>`);
    return `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${today}</lastmod>\n${alts.join('\n')}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}
