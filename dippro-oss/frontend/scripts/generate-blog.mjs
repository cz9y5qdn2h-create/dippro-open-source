// Génère des pages de blog HTML statiques au build — parfait pour le SEO et le GEO (IA).
// Robuste : toute erreur est loggée mais ne fait JAMAIS échouer le build de l'app.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const SITE = 'https://iralink-agency.dippro.business';
const BRAND = 'DIPpro';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(root, 'content', 'blog');
const DIST = join(root, 'dist');
const BLOG_OUT = join(DIST, 'blog');

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s) {
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function mdToHtml(md) {
  const lines = md.split('\n');
  let html = '', i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^###\s+/.test(line)) { html += `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`; i++; continue; }
    if (/^##\s+/.test(line))  { html += `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`;  i++; continue; }
    if (/^>\s?/.test(line))   { html += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`; i++; continue; }
    // Tableaux Markdown — sans ce cas, une ligne « | a | b | » tombait dans
    // le traitement paragraphe et s'affichait avec ses barres verticales
    // brutes, illisible pour un lecteur comme pour un moteur de recherche.
    if (/^\|.*\|\s*$/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      html += `<table><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead>`
            + `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`); i++; }
      html += `<ol>${items.join('')}</ol>`; continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`); i++; }
      html += `<ul>${items.join('')}</ul>`; continue;
    }
    if (line.trim() === '') { i++; continue; }
    const para = [line]; i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{2,3}\s|>|\d+\.\s|[-*]\s)/.test(lines[i])) { para.push(lines[i]); i++; }
    html += `<p>${inline(para.join(' '))}</p>`;
  }
  return html;
}

function parseFront(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  m[1].split('\n').forEach(l => {
    const mm = l.match(/^(\w+):\s*(.*)$/);
    if (mm) meta[mm[1]] = mm[2].replace(/^"(.*)"$/, '$1');
  });
  return { meta, body: m[2] };
}

const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0a0805;color:#e8e4dc;font-family:'Geist',system-ui,-apple-system,sans-serif;line-height:1.7}
a{color:#C8A96E}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.site{border-bottom:.5px solid rgba(200,169,110,.16);padding:16px 0;position:sticky;top:0;background:rgba(10,8,5,.85);backdrop-filter:blur(16px)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between}
.logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#f4f2ee;text-decoration:none}
.cta{background:#C8A96E;color:#080808;font-weight:600;font-size:13px;padding:9px 16px;border-radius:10px;text-decoration:none}
article{padding:40px 0 24px}
h1{font-size:2.1rem;line-height:1.2;margin:0 0 .4rem;color:#f4f2ee;font-weight:400}
article h2{font-size:1.45rem;margin:2.2rem 0 .6rem;color:#f4f2ee;font-weight:500}
article h3{font-size:1.12rem;margin:1.6rem 0 .3rem;color:#f4f2ee;font-weight:500}
.meta{color:rgba(244,242,238,.42);font-size:13px;margin-bottom:8px}
.lead{color:rgba(244,242,238,.62);font-size:1.05rem;margin:0 0 8px}
article p{color:rgba(244,242,238,.82)}
article li{color:rgba(244,242,238,.82);margin:4px 0}
blockquote{border-left:2px solid #C8A96E;margin:1.5rem 0;padding:.4rem 0 .4rem 1rem;color:rgba(244,242,238,.72);font-style:italic}
table{width:100%;border-collapse:collapse;margin:1.6rem 0;font-size:.94rem;display:block;overflow-x:auto}
th{text-align:left;padding:.6rem .7rem;border-bottom:1px solid rgba(200,169,110,.3);color:#C8A96E;font-weight:500;white-space:nowrap}
td{padding:.6rem .7rem;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top}
tbody tr:last-child td{border-bottom:none}
.endcta{border:.5px solid rgba(200,169,110,.28);background:rgba(200,169,110,.06);border-radius:14px;padding:24px;margin:36px 0 12px;text-align:center}
.endcta h3{margin:0 0 8px;color:#f4f2ee}
footer.site{border-top:.5px solid rgba(200,169,110,.14);padding:28px 0;color:rgba(244,242,238,.4);font-size:13px}
.back{display:inline-block;margin:8px 0 0;font-size:14px}
.card{display:block;border:.5px solid rgba(200,169,110,.16);border-radius:14px;padding:20px;margin:14px 0;text-decoration:none;background:rgba(255,255,255,.015)}
.card h2{margin:0 0 6px;font-size:1.25rem;color:#f4f2ee}
.card p{margin:0;color:rgba(244,242,238,.6)}
`;

function shell({ title, description, canonical, bodyHtml, jsonLd, ogType = 'website' }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="canonical" href="${canonical}"/>
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large"/>
<meta property="og:type" content="${ogType}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta property="og:site_name" content="${BRAND}"/>
<meta property="og:locale" content="fr_FR"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${SITE}/og-image.png"/>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>${CSS}</style>
${jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
<header class="site"><div class="wrap"><a class="logo" href="${SITE}/">DIPpro</a><a class="cta" href="${SITE}/waitlist">Accès anticipé</a></div></header>
<div class="wrap">${bodyHtml}</div>
<footer class="site"><div class="wrap">DIPpro by Iralink — Gestion légale du DIP franchise. <a href="${SITE}/">Découvrir la plateforme</a></div></footer>
</body>
</html>`;
}

function articleShell(a) {
  const url = `${SITE}/blog/${a.slug}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: a.title, description: a.description,
      datePublished: a.date, dateModified: a.date,
      inLanguage: 'fr', keywords: a.keywords || '',
      author: { '@type': 'Organization', name: a.author || 'Iralink Agency' },
      publisher: { '@type': 'Organization', name: 'Iralink Agency', logo: { '@type': 'ImageObject', url: `${SITE}/og-image.png` } },
      mainEntityOfPage: url, image: `${SITE}/og-image.png`,
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: a.title, item: url },
      ],
    },
  ];
  const body = `
<article>
<a class="back" href="${SITE}/blog">← Tous les articles</a>
<h1>${esc(a.title)}</h1>
<div class="meta">${new Date(a.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · ${esc(a.author || 'Iralink Agency')}</div>
<p class="lead">${esc(a.description)}</p>
${a.html}
<div class="endcta">
<h3>Vérifiez la conformité de votre DIP en 30 secondes</h3>
<p>DIPpro analyse votre DIP par IA selon la Loi Doubin, détecte les risques de litige et génère une attestation certifiée.</p>
<p><a class="cta" href="${SITE}/waitlist">Demander un accès anticipé</a></p>
</div>
</article>`;
  return shell({ title: `${a.title} — ${BRAND}`, description: a.description, canonical: url, bodyHtml: body, jsonLd, ogType: 'article' });
}

function indexShell(articles) {
  const url = `${SITE}/blog`;
  const jsonLd = [{
    '@context': 'https://schema.org', '@type': 'Blog', url,
    name: 'Blog DIPpro — Franchise & Loi Doubin', inLanguage: 'fr',
    publisher: { '@type': 'Organization', name: 'Iralink Agency' },
    blogPost: articles.map(a => ({ '@type': 'BlogPosting', headline: a.title, url: `${SITE}/blog/${a.slug}`, datePublished: a.date })),
  }];
  const body = `
<article>
<h1>Blog DIPpro — Franchise & conformité DIP</h1>
<p class="lead">Ressources sur la Loi Doubin, le Document d'Information Précontractuelle et le droit de la franchise.</p>
${articles.map(a => `<a class="card" href="${SITE}/blog/${a.slug}"><h2>${esc(a.title)}</h2><div class="meta">${new Date(a.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div><p>${esc(a.description)}</p></a>`).join('')}
</article>`;
  return shell({ title: 'Blog — Franchise & Loi Doubin', description: 'Articles et guides sur le DIP franchise, la Loi Doubin et la conformité pour franchiseurs.', canonical: url, bodyHtml: body, jsonLd });
}

function updateSitemap(articles) {
  const smPath = join(DIST, 'sitemap.xml');
  if (!existsSync(smPath)) return;
  let sm = readFileSync(smPath, 'utf8');
  if (sm.includes('/blog</loc>')) return; // déjà fait
  const today = articles[0]?.date || '2026-07-14';
  const entries = [
    `  <url><loc>${SITE}/blog</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    ...articles.map(a => `  <url><loc>${SITE}/blog/${a.slug}</loc><lastmod>${a.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
  ].join('\n');
  sm = sm.replace('</urlset>', entries + '\n</urlset>');
  writeFileSync(smPath, sm);
}

try {
  if (!existsSync(CONTENT_DIR)) { console.log('[blog] aucun dossier content/blog — ignoré'); process.exit(0); }
  const files = readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  if (!files.length) { console.log('[blog] aucun article'); process.exit(0); }

  const articles = files.map(f => {
    const { meta, body } = parseFront(readFileSync(join(CONTENT_DIR, f), 'utf8'));
    return { ...meta, slug: f.replace(/\.md$/, ''), html: mdToHtml(body) };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!existsSync(BLOG_OUT)) mkdirSync(BLOG_OUT, { recursive: true });
  writeFileSync(join(BLOG_OUT, 'index.html'), indexShell(articles));
  for (const a of articles) writeFileSync(join(BLOG_OUT, `${a.slug}.html`), articleShell(a));
  updateSitemap(articles);

  console.log(`[blog] ${articles.length} article(s) généré(s) → dist/blog/`);
} catch (e) {
  console.error('[blog] erreur (ignorée pour ne pas casser le build) :', e.message);
  process.exit(0);
}
