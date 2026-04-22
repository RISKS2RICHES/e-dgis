import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const feeds = [
    { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews" },
    { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  ];
  const results: any[] = [];

  await Promise.allSettled(
    feeds.map(async (feed) => {
      const r = await fetch(feed.url, { signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0" } });
      if (!r.ok) return;
      const xml = await r.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      items.slice(0, 8).forEach((item, i) => {
        const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
        const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim();
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim();
        const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/))?.[1]
          ?.replace(/<[^>]*>/g, "")?.trim()?.substring(0, 200);
        if (title && link)
          results.push({ id: `${feed.name}_${i}`, title, url: link, date: pubDate, source: feed.name, excerpt: desc });
      });
    })
  );

  res.json({ status: "ok", count: results.length, items: results.slice(0, 40), ts: Date.now() });
}
