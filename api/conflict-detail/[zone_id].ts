import type { VercelRequest, VercelResponse } from "@vercel/node";

const ZONE_KEYWORDS: Record<string, string> = {
  ukraine: "ukraine russia war",
  gaza: "gaza israel hamas",
  west_bank: "west bank israel",
  lebanon: "hezbollah israel lebanon",
  syria: "syria conflict war",
  yemen: "houthi yemen",
  sudan: "sudan war RSF SAF",
  myanmar: "myanmar junta military",
  drc_east: "DRC congo m23",
  somalia: "somalia alshabaab",
  kashmir: "india pakistan kashmir",
  sahel_mali: "mali sahel insurgency",
  burkina_faso: "burkina faso jihadist",
  russia_kursk: "kursk ukraine russia",
  haiti: "haiti gang violence",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const zoneId = req.query.zone_id as string;
  const keyword = ZONE_KEYWORDS[zoneId] || zoneId.replace(/_/g, " ");
  const gnNews: any[] = [];
  const rwNews: any[] = [];

  await Promise.allSettled([
    // Google News RSS
    fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then(async (r) => {
      if (!r.ok) return;
      const xml = await r.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      items.slice(0, 15).forEach((item, i) => {
        const title =
          (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
            item.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
        const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim();
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim();
        const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim();
        if (title && link)
          gnNews.push({ id: `gn_${i}`, title, url: link, date: pubDate, source: source || "Google News", excerpt: null });
      });
    }).catch(() => {}),

    // Reliefweb
    fetch(
      `https://api.reliefweb.int/v1/reports?appname=edgis&limit=10&fields[include][]=title,url,date,source&query[value]=${encodeURIComponent(keyword)}&query[fields][]=title&sort[]=date:desc`,
      { signal: AbortSignal.timeout(6000) }
    ).then(async (r) => {
      if (!r.ok) return;
      const d: any = await r.json();
      if (d.data) {
        d.data.forEach((item: any) => {
          rwNews.push({
            id: item.id,
            title: item.fields?.title,
            url: item.fields?.url || `https://reliefweb.int/node/${item.id}`,
            date: item.fields?.date?.created,
            source: item.fields?.source?.[0]?.name || "Reliefweb",
            excerpt: null,
          });
        });
      }
    }).catch(() => {}),
  ]);

  res.json({
    status: "ok",
    zone_id: zoneId,
    keyword,
    news: [...gnNews, ...rwNews].slice(0, 25),
    ts: Date.now(),
  });
}
