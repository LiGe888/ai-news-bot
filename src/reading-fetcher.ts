import RSSParser from 'rss-parser';

export interface ReadingArticle {
  title: string;
  link: string;
  source: string;
  snippet?: string;
  date?: string;
}

// 适合 5000 词汇量水平的英文阅读源
// 选择语言难度适中的新闻和科普类 RSS
const READING_FEEDS = [
  { name: 'VOA Learning English', url: 'https://learningenglish.voanews.com/api/z-qoerekvi' },
  { name: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish/english/rss' },
  { name: 'Simple English News', url: 'https://www.simpleenglishnews.com/feed/' },
  { name: 'News in Levels', url: 'https://www.newsinlevels.com/feed/' },
  { name: 'Breaking News English', url: 'https://breakingnewsenglish.com/rss.xml' },
];

const parser = new RSSParser();

async function fetchFeed(name: string, url: string): Promise<ReadingArticle[]> {
  try {
    const feed = await parser.parseURL(url);
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
  md += `> 词汇量约 5000，适合中级英语学习者\n\n`;

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
