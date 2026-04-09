import RSSParser from 'rss-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ReadingArticle {
  title: string;
  link: string;
  source: string;
  snippet?: string;
  image?: string;
  date?: string;
  isDuplicate?: boolean;
}

// 有趣好玩的英文阅读源 - 科技/自然/奇闻/科普
const READING_FEEDS = [
  { name: '🚀 NASA', url: 'https://www.nasa.gov/feed/' },
  { name: '🔬 IFLScience', url: 'https://www.iflscience.com/rss' },
  { name: '🧪 Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/science' },
  { name: '🌍 Atlas Obscura', url: 'https://www.atlasobscura.com/feeds/latest' },
  { name: '🎙️ TED Talks', url: 'https://feeds.feedburner.com/TEDTalks_audio' },
  { name: '🌐 CGTN', url: 'https://www.cgtn.com/subscribe/rss/section/world.xml' },
  { name: '🛸 Space.com', url: 'https://www.space.com/feeds/all' },
  { name: '🧠 MIT News', url: 'https://news.mit.edu/rss/feed' },
  { name: '💡 The Conversation', url: 'https://theconversation.com/us/technology/articles.atom' },
];

const ITEMS_PER_SOURCE = 5;

const parser = new RSSParser({
  timeout: 15000,
  customFields: {
    item: [['media:content', 'mediaContent', { keepArray: false }]],
  },
});

// 从 RSS item 中提取封面图
function extractImage(item: any): string {
  // media:content
  if (item.mediaContent?.['$']?.url) return item.mediaContent['$'].url;
  // enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) return item.enclosure.url;
  // 从 content 中提取第一个 img src
  const content = item['content:encoded'] || item.content || '';
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (match) return match[1];
  return '';
}

// 已推送记录文件路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_FILE = path.join(__dirname, '..', '.pushed-reading.json');

function loadHistory(): Set<string> {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      // 只保留最近 7 天的记录，防止文件无限增长
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = data.filter((r: { link: string; ts: number }) => r.ts > weekAgo);
      return new Set(recent.map((r: { link: string }) => r.link));
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveHistory(links: string[]) {
  let records: { link: string; ts: number }[] = [];
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      records = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  records = records.filter(r => r.ts > weekAgo);
  const now = Date.now();
  for (const link of links) {
    if (!records.some(r => r.link === link)) {
      records.push({ link, ts: now });
    }
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(records, null, 2));
}

async function fetchFeed(name: string, url: string): Promise<ReadingArticle[]> {
  try {
    console.log(`📡 正在抓取 ${name}...`);
    const feed = await parser.parseURL(url);
    console.log(`✅ ${name} 抓取成功，${feed.items?.length || 0} 条`);
    return (feed.items || []).map(item => ({
      title: item.title || 'Untitled',
      link: item.link || '',
      source: name,
      snippet: item.contentSnippet?.slice(0, 100) || '',
      image: extractImage(item),
      date: item.pubDate,
    }));
  } catch (err) {
    console.warn(`⚠️ 抓取 ${name} 失败:`, (err as Error).message);
    return [];
  }
}

export async function fetchReadingArticles(): Promise<Map<string, ReadingArticle[]>> {
  const history = loadHistory();
  const results = await Promise.allSettled(
    READING_FEEDS.map(f => fetchFeed(f.name, f.url))
  );

  const grouped = new Map<string, ReadingArticle[]>();
  const allPushedLinks: string[] = [];

  for (const result of results) {
    if (result.status !== 'fulfilled' || result.value.length === 0) continue;

    const articles = result.value;
    const source = articles[0].source;

    // 优先选未推送过的，不够再补重复的
    const fresh = articles.filter(a => !history.has(a.link));
    const dupes = articles.filter(a => history.has(a.link)).map(a => ({ ...a, isDuplicate: true }));

    const selected = [...fresh.slice(0, ITEMS_PER_SOURCE)];
    if (selected.length < ITEMS_PER_SOURCE) {
      selected.push(...dupes.slice(0, ITEMS_PER_SOURCE - selected.length));
    }

    if (selected.length > 0) {
      grouped.set(source, selected);
      allPushedLinks.push(...selected.filter(a => !a.isDuplicate).map(a => a.link));
    }
  }

  // 保存本次推送的新文章链接
  saveHistory(allPushedLinks);
  return grouped;
}

export function formatReadingMarkdown(grouped: Map<string, ReadingArticle[]>): string[] {
  const date = new Date().toLocaleDateString('zh-CN');
  const messages: string[] = [];

  // 每篇文章单独一条消息
  for (const [source, articles] of grouped) {
    for (const item of articles) {
      const tag = item.isDuplicate ? ' 🔁' : '';
      let md = `## ${source} - ${date}\n\n`;
      md += `**[${item.title}](${item.link})**${tag}\n\n`;
      if (item.image) {
        md += `![](${item.image})\n\n`;
      }
      if (item.snippet) {
        md += `> ${item.snippet}\n\n`;
      }
      md += '> 每日英语阅读 Bot';
      messages.push(md);
    }
  }

  return messages;
}
