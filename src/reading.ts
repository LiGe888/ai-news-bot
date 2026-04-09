import { fetchReadingArticles, formatReadingMarkdown } from './reading-fetcher.js';
import { sendToDingTalk } from './dingtalk.js';

async function main() {
  const webhook = process.env.READING_DINGTALK_WEBHOOK;
  if (!webhook) {
    console.error('❌ 请设置 READING_DINGTALK_WEBHOOK 环境变量');
    process.exit(1);
  }

  console.log('📖 正在抓取英语阅读语篇...');
  const articles = await fetchReadingArticles();

  if (articles.length === 0) {
    console.log('📭 今日暂无新文章');
    return;
  }

  console.log(`📰 获取到 ${articles.length} 篇文章，正在推送...`);
  const markdown = formatReadingMarkdown(articles);

  await sendToDingTalk(
    { webhook, secret: process.env.READING_DINGTALK_SECRET },
    '每日英语阅读',
    markdown
  );
}

main().catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
