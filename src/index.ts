import { fetchAllNews, formatAsMarkdown } from './fetcher.js';
import { sendToDingTalk } from './dingtalk.js';

async function main() {
  const webhook = process.env.DINGTALK_WEBHOOK;
  if (!webhook) {
    console.error('❌ 请设置 DINGTALK_WEBHOOK 环境变量');
    process.exit(1);
  }

  console.log('🔍 正在抓取 AI 资讯...');
  const news = await fetchAllNews();

  if (news.length === 0) {
    console.log('📭 今日暂无新资讯');
    return;
  }

  console.log(`📰 获取到 ${news.length} 条资讯，正在推送...`);
  const markdown = formatAsMarkdown(news);

  await sendToDingTalk(
    { webhook, secret: process.env.DINGTALK_SECRET },
    'AI资讯',
    markdown
  );
}

// 2 分钟全局超时，防止卡死
setTimeout(() => {
  console.error('⏰ 全局超时，强制退出');
  process.exit(1);
}, 120_000);

main().catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
