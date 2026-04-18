// GET /admin/telegram-test
// Sends a test message to the configured Telegram chat so you can verify
// the bot token and chat ID are correct before relying on real-order
// notifications. Protected by the admin middleware (password required).

import { sendTelegramText } from '../_lib/telegram.js';

export async function onRequestGet({ env, request }) {
  const baseUrl = new URL(request.url).origin;

  const hasToken = !!env.TELEGRAM_BOT_TOKEN;
  const hasChat = !!env.TELEGRAM_CHAT_ID;

  if (!hasToken || !hasChat) {
    return htmlResp(renderStatus({
      ok: false,
      msg: `Missing secrets.  TELEGRAM_BOT_TOKEN: ${hasToken ? 'set' : 'not set'}  ·  TELEGRAM_CHAT_ID: ${hasChat ? 'set' : 'not set'}`,
      baseUrl,
    }));
  }

  const now = new Date().toISOString();
  const text =
    `✅ <b>Durible3D · Telegram test</b>\n\n` +
    `If you are reading this, the bot and chat ID are correctly wired.\n\n` +
    `• Time: <code>${now}</code>\n` +
    `• Source: <a href="${baseUrl}/admin">admin dashboard</a>\n\n` +
    `You will receive a message like this every time a new order is submitted.`;

  const result = await sendTelegramText(env, text);
  return htmlResp(renderStatus({ ok: result.ok, msg: result.ok
    ? 'Test message sent. Check your Telegram app.'
    : 'Send failed: ' + JSON.stringify(result),
    baseUrl,
  }));
}

function htmlResp(html) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function renderStatus({ ok, msg, baseUrl }) {
  const color = ok ? '#2d6a4f' : '#9b2226';
  const icon = ok ? '✅' : '✗';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Telegram test</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#faf8f4;color:#1a1a1a;padding:40px;margin:0;line-height:1.5}
.card{max-width:600px;margin:40px auto;background:#fff;border:1px solid #e8e1d3;border-left:4px solid ${color};padding:28px 32px}
h1{font-family:Georgia,serif;font-size:28px;font-weight:400;margin:0 0 12px;color:${color}}
p{margin:8px 0;color:#333}
code{background:#f3ede0;padding:2px 6px;border-radius:2px;font-size:13px}
a{color:#8b3a2f;text-decoration:none;border-bottom:1px solid currentColor}
.btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#1a1a1a;color:#fff;font-size:13px;text-transform:uppercase;letter-spacing:1.5px}
</style>
</head><body>
  <div class="card">
    <h1>${icon} Telegram</h1>
    <p>${msg}</p>
    <p><a class="btn" href="${baseUrl}/admin">← Back to admin</a></p>
  </div>
</body></html>`;
}
