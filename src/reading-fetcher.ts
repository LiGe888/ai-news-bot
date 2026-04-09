import RSSParser from 'rss-parser';

export interface ReadingArticle {
  title: string;
  link: string;
  source: string;
  snippet?: string;
  date?: string;
}

// 科技/自然/科学类英文阅读源，适合 5000 词汇量
const READING_FEEDS = [
  { name: 'NASA Science', url: 'https://science.nasa.gov/rss-feed/' },
  { name: 'National Geographic', url: 'https://www.nationalgeographic.com/feed' },
  { name: 'Scientific American', url: 'https://rss.sciam.com/ScientificAmerican-Global' },
  { name: 'New Scientist', url: 'https://www.newscientist.com/section/news/feed/' },
  { name: 'Nature News', url: 'https://www.nature.com/nature.rss' },
  { name: 'Live Science', url: 'https://www.livescience.com/feeds/all' },
  { name: 'Phys.org', url: 'https://phys.org/rss-feed/' },
];

const parser = new RSSParser({
  timeout: 15000, // 15 秒超时
});

async function fetchFeed(name: string, url: string): Promise<ReadingArticle[]> {
  try {
    console.log(`📡 正在抓取 ${name}...`);
    const feed = await parser.parseURL(url);
    console.log(`✅ ${name} 抓取成功，${feed.items?.length || 0} 条`);
    return (feed.items || []).slice(0, 3).map(item => ({
      title: item.title || 'Untitled',
      link: item.link || '',
      source: name,
      snippet: item.contentSnippet?.slice(0, 150) || '',
      date: item.pubDate,
    }));
  } catch (err) {
    console.warn(`⚠️ 抓取 ${name} 失败:`, (err as Error).message);
    return [];
  }
}

export async function fetchReadingArticles(): Promise<ReadingArticle[]> {
  const results = await Promise.allSettled(
    READING_FEEDS.map(f => fetchFeed(f.name, f.url))
  );

  const all: ReadingArticle[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      all.push(...result.value);
    }
  }

  return all
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    })
    .slice(0, 10);
}

export function formatReadingMarkdown(articles: ReadingArticle[]): string {
  const date = new Date().toLocaleDateString('zh-CN');
  let md = `## 📖 每日英语阅读 - ${date}\n\n`;
  md += `> 科技·自然·科学，适合中级英语学习者\n\n`;

  for (const item of articles) {
    md += `### 📌 ${item.source}\n\n`;
    md += `**[${item.title}](${item.link})**\n\n`;
    if (item.snippet) {
      md += `> ${item.snippet}...\n\n`;
    }
  }

  md += '---\n> 每日英语阅读 Bot 自动推送';
  return md;
}
