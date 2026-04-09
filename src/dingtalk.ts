import crypto from 'node:crypto';

interface DingTalkConfig {
  webhook: string;
  secret?: string;
}

function getSignedUrl(webhook: string, secret: string): string {
  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
  const sign = encodeURIComponent(hmac);
  return `${webhook}&timestamp=${timestamp}&sign=${sign}`;
}

export async function sendToDingTalk(config: DingTalkConfig, title: string, markdown: string): Promise<void> {
  const url = config.secret ? getSignedUrl(config.webhook, config.secret) : config.webhook;

  const body = {
    msgtype: 'markdown',
    markdown: { title, text: markdown },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`📡 钉钉响应状态: ${res.status}`);
  console.log(`📡 钉钉响应内容: ${text}`);

  if (!res.ok) {
    throw new Error(`钉钉 HTTP 错误 ${res.status}: ${text.slice(0, 200)}`);
  }

  try {
    const data = JSON.parse(text) as { errcode: number; errmsg: string };
    if (data.errcode === 660026) {
      // 频率限制，返回特殊标记让调用方重试
      console.warn('⚠️ 钉钉频率限制，需要等待');
      throw Object.assign(new Error('rate_limited'), { retryable: true });
    }
    if (data.errcode !== 0) {
      throw new Error(`钉钉推送失败: ${data.errmsg}`);
    }
    console.log('✅ 钉钉推送成功');
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`钉钉返回非 JSON 响应: ${text.slice(0, 200)}`);
    }
    throw e;
  }
}
