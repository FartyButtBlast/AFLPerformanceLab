import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../data/news-feed.js", import.meta.url);

const sources = [
  {
    source: "AFL.com.au",
    url: "https://www.afl.com.au/rss",
    parser: parseRss,
  },
  {
    source: "ABC Sport",
    url: "https://www.abc.net.au/news/sport/afl/",
    parser: parseAbcPage,
  },
  {
    source: "The Guardian",
    url: "https://www.theguardian.com/sport/australian-rules-football/rss",
    parser: parseRss,
  },
];

function decodeEntities(value = "") {
  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    const next = decoded
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function stripTags(value = "") {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(url, base) {
  if (!url) return "";
  try {
    return new URL(decodeEntities(url), base).toString();
  } catch {
    return "";
  }
}

function cleanSummary(value = "") {
  return stripTags(value).replace(/\s+/g, " ").slice(0, 220);
}

function cleanTitle(value = "") {
  return stripTags(value)
    .replace(/\s+/g, " ")
    .replace(/^#+\s*/, "")
    .trim();
}

function isBadNewsText(value = "") {
  const text = value.toLowerCase();
  return [
    "class=",
    "href=",
    "typography_",
    "taxonomybutton",
    "button_",
    "logo__",
    "<time",
    "-->",
    "m19 ",
    "personal finance",
    "relationships & family",
    "berita bahasa indonesia",
    "emergency",
    "appearance",
  ].some((fragment) => text.includes(fragment));
}

function isLikelyHeadline(title) {
  if (!title || title.length < 12 || title.length > 160) return false;
  if (isBadNewsText(title)) return false;
  if (/^[\w\s&]+:$/.test(title)) return false;
  return /[a-zA-Z]/.test(title);
}

function getAttr(html, attr) {
  return html.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))?.[1] ?? "";
}

function imageFromBlock(block, base) {
  const img = block.match(/<img[^>]+(?:src|data-src|data-original|data-picture-src)=["']([^"']+)["']/i)?.[1];
  const meta = block.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  return absoluteUrl(img || meta, base);
}

function parseAflPage(html, source) {
  const items = [];
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const match of links) {
    const href = absoluteUrl(match[1], source.url);
    const title = stripTags(match[2]);
    if (!title || title.length < 18) continue;
    if (!href.includes("afl.com.au/news") && !href.includes("afl.com.au/afl/news")) continue;
    const index = match.index ?? 0;
    const block = html.slice(Math.max(0, index - 600), index + 1200);
    const after = stripTags(block.replace(match[0], " "));
    const summary = cleanSummary(after.replace(title, ""));
    items.push({
      title,
      byline: "AFL.com.au",
      source: source.source,
      summary,
      image: imageFromBlock(block, source.url),
      url: href,
    });
  }
  return items;
}

function parseAbcPage(html, source) {
  const items = [];
  const aflSection = html.includes("AFL Score Centre")
    ? html.slice(html.indexOf("AFL Score Centre"), html.indexOf("Latest AFL Audio") > 0 ? html.indexOf("Latest AFL Audio") : undefined)
    : html;
  const articles = aflSection.match(/<a[^>]+href=["'][^"']*\/news\/[^"']+["'][^>]*>[\s\S]*?<\/a>/gi) ?? [];
  for (const article of articles) {
    const href = absoluteUrl(getAttr(article, "href"), source.url);
    const title = cleanTitle(
      article.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] ??
        article.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
        article,
    );
    if (!isLikelyHeadline(title) || !href.includes("abc.net.au/news/")) continue;
    const index = html.indexOf(article);
    const block = html.slice(Math.max(0, index - 600), index + 1400);
    const summary = cleanSummary(stripTags(block).replace(title, ""));
    if (isBadNewsText(summary)) continue;
    items.push({
      title,
      byline: "ABC Sport",
      source: source.source,
      summary,
      image: imageFromBlock(block, source.url),
      url: href,
    });
  }
  return items;
}

function parseRss(xml, source) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = cleanTitle(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const link = stripTags(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? "");
    const creator = stripTags(block.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i)?.[1] ?? "");
    const description = cleanSummary(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? "");
    const media =
      block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ??
      block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] ??
      "";
    if (!isLikelyHeadline(title) || !link || isBadNewsText(description)) continue;
    items.push({
      title,
      byline: creator ? `${source.source} - ${creator}` : source.source,
      source: source.source,
      summary: description,
      image: absoluteUrl(media, source.url),
      url: absoluteUrl(link, source.url),
    });
  }
  return items;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.url || item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const fetchedAt = new Date().toISOString();
const allItems = [];

for (const source of sources) {
  try {
    console.log(`Fetching ${source.source}`);
    const response = await fetch(source.url, {
      headers: { "user-agent": "SportzLabs news builder" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`${response.status}`);
    const text = await response.text();
    allItems.push(...source.parser(text, source));
  } catch (error) {
    console.warn(`Could not fetch ${source.source}: ${error.message}`);
  }
}

const items = dedupe(allItems)
  .filter((item) => item.title && item.url)
  .slice(0, 36);

if (!items.length) {
  try {
    const existing = await readFile(OUT_FILE, "utf8");
    if (existing.includes("items") && !existing.includes('"items": []')) {
      console.warn("No fresh news items found; keeping the existing news feed.");
      process.exit(0);
    }
  } catch {
    // No existing feed yet, so write an empty feed that the UI can explain clearly.
  }
}

await mkdir(new URL("../data", import.meta.url), { recursive: true });
await writeFile(
  OUT_FILE,
  `window.NEWS_FEED = ${JSON.stringify(
    {
      fetchedAt,
      sources: sources.map((source) => source.source),
      items,
    },
    null,
    2,
  )};\n`,
);

console.log(`Wrote ${items.length} news items.`);
