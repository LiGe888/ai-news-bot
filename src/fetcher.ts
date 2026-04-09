import RSSParser from 'rss-parser';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  date?: string;
}

// AI 相关 RSS 源
const RSS_FEEDS = [
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/feed/' },
  { name: 'The Batch (DeepLearning.AI)', url: 'https://www.deeplearning.ai/the-batch/feed/' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'Hacker News AI', url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+machine+learning&points=50' },
  { name: 'ArXiv CS.AI', url: 'https://rss.arxiv.org/rss/cs.AI' },
];

const parser = new RSSParser({
  timeout: 15000, // 15 秒超时
});

async function fetchFeed(name: string, url: string): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).slice(0, 5).map(item => ({
      title: item.title || '无标题',
      link: item.link || '',
      source: name,
      date: item.pubDate,
    }));
  } catch (err) {
    console.warn(`⚠️ 抓取 ${name} 失败:`, (err as Error).message);
    return [];
  }
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(f => fetchFeed(f.name, f.url))
  );

  const allNews: NewsItem[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
    }
  }

  // 按时间排序，最新的在前
  return allNews
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    })
    .slice(0, 20); // 最多推送 20 条
}

export function formatAsMarkdown(news: NewsItem[]): string {
  const date = new Date().toLocaleDateString('zh-CN');
  let md = `## 🤖 AI资讯 - 前沿动态 ${date}\n\n`;

  const grouped = new Map<string, NewsItem[]>();
  for (const item of news) {
    const list = grouped.get(item.source) || [];
    list.push(item);
    grouped.set(item.source, list);
  }

  for (const [source, items] of grouped) {
    md += `### 📌 ${source}\n\n`;
    for (const item of items) {
      md += `- [${item.title}](${item.link})\n`;
    }
    md += '\n';
  }

  md += '---\n> 由 AI资讯 Bot 自动推送';
  return md;
}
