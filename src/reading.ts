import { fetchReadingArticles, formatReadingMarkdown } from './reading-fetcher.js';
import { sendToDingTalk } from './dingtalk.js';

async function main() {
  const webhook = process.env.READING_DINGTALK_WEBHOOK;
  if (!webhook) {
    console.error('❌ 请设置 READING_DINGTALK_WEBHOOK 环境变量');
    process.exit(1);
  }

  console.log('📖 正在抓取英语阅读语篇...');
  const grouped = await fetchReadingArticles();

  if (grouped.size === 0) {
    console.log('📭 今日暂无新文章');
    return;
  }

  let total = 0;
  for (const articles of grouped.values()) total += articles.length;
  console.log(`📰 获取到 ${grouped.size} 个分类共 ${total} 篇文章，正在推送...`);
  const messages = formatReadingMarkdown(grouped);

  console.log(`📨 共 ${messages.length} 条消息需要推送`);
  for (let i = 0; i < messages.length; i++) {
    console.log(`📤 推送第 ${i + 1}/${messages.length} 条 (${messages[i].length} 字符)...`);
    await sendToDingTalk(
      { webhook, secret: process.env.READING_DINGTALK_SECRET },
      '每日英语阅读',
      messages[i]
    );
    // 多条消息间隔 1 秒，避免触发钉钉频率限制
    if (i < messages.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// 2 分钟全局超时，防止卡死
setTimeout(() => {
  console.log('⏰ 全局超时，强制退出');
  process.exit(0);
}, 120_000);

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
