const FEEDS = [
  { id: 'fff', name: 'Fédération Française de la Franchise', url: 'https://www.franchise-fff.com/feed/', category: 'franchise', color: '#F5C842' },
  { id: 'village_justice', name: 'Village de la Justice', url: 'https://www.village-justice.com/rss.php', category: 'juridique', color: '#60a5fa' },
  { id: 'legifrance', name: 'Légifrance — JORF', url: 'https://www.legifrance.gouv.fr/rss/jorf.xml', category: 'réglementaire', color: '#f87171' },
  { id: 'entreprendre', name: 'Entreprendre.fr', url: 'https://www.entreprendre.fr/feed/', category: 'franchise', color: '#34d399' },
  { id: 'toute_franchise', name: 'Toute la Franchise', url: 'https://www.toute-la-franchise.com/feed/', category: 'franchise', color: '#a78bfa' },
];

// Partagé entre GET /monitoring/news (affichage à la demande) et le cron
// (analyse IA périodique) — même schéma d'id (utilisé comme clé du cache
// d'analyse) pour que les deux se recoupent sans dérive.
async function fetchNewsItems() {
  const Parser = require('rss-parser');
  const parser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'DIPpro-Monitor/1.0' } });

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items.slice(0, 5).map(item => ({
        id: `${feed.id}-${Buffer.from(item.link || item.title || '').toString('base64').slice(0, 12)}`,
        title: item.title?.trim() || 'Sans titre',
        url: item.link || '',
        date: item.pubDate || item.isoDate || null,
        summary: (item.contentSnippet || item.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 200) || null,
        source: feed.name,
        sourceId: feed.id,
        category: feed.category,
        color: feed.color,
      }));
    })
  );

  const items = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => (b.date ? new Date(b.date) : 0) - (a.date ? new Date(a.date) : 0))
    .slice(0, 30);

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  return { items, feedsOk: successCount, feedsTotal: FEEDS.length };
}

module.exports = { FEEDS, fetchNewsItems };
