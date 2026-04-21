// GET /admin/whatsapp-test
// Sends a test WhatsApp message via CallMeBot so you can verify the phone
// number and API key are correct before relying on real-order notifications.
// Protected by the admin middleware (password required).

import { sendWhatsApp } from '../_lib/whatsapp.js';

export async function onRequestGet({ env, request }) {
  const baseUrl = new URL(request.url).origin;

  const hasPhone = !!env.WHATSAPP_PHONE;
  const hasKey = !!env.CALLMEBOT_API_KEY;

  if (!hasPhone || !hasKey) {
    return htmlResp(renderStatus({
      ok: false,
      msg:
        `Missing secrets. WHATSAPP_PHONE: ${hasPhone ? 'set' : 'NOT SET'} · ` +
        `CALLMEBOT_API_KEY: ${hasKey ? 'set' : 'NOT SET'}. ` +
        `See DEPLOY_NOTES.md → WhatsApp notifications for setup.`,
      baseUrl,
    }));
  }

  const now = new Date().toISOString();
  const text =
    `✅ Ordo · WhatsApp test\n\n` +
    `If you can read this, your CallMeBot integration is wired correctly.\n\n` +
    `Time: ${now}\n` +
    `Source: ${baseUrl}/admin\n\n` +
    `You will receive a message like this every time a new order is submitted.`;

  const result = await sendWhatsApp(env, text);
  return htmlResp(renderStatus({
    ok: result.ok,
    msg: result.ok
      ? 'Test message sent. Check your WhatsApp.'
      : 'Send failed: ' + JSON.stringify(result),
    baseUrl,
  }));
}

function htmlResp(html) {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function renderStatus({ ok, msg, baseUrl }) {
  const color = ok ? '#2d6a4f' : '#9b2226';
  const icon = ok ? '✅' : '✗';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>WhatsApp test</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#faf8f4;color:#1a1a1a;padding:40px;margin:0;line-height:1.5}
.card{max-width:640px;margin:40px auto;background:#fff;border:1px solid #e8e1d3;border-left:4px solid ${color};padding:28px 32px}
h1{font-family:Georgia,serif;font-size:28px;font-weight:400;margin:0 0 12px;color:${color}}
p{margin:8px 0;color:#333;word-wrap:break-word}
code{background:#f3ede0;padding:2px 6px;border-radius:2px;font-size:13px;white-space:pre-wrap}
a{color:#8b3a2f;text-decoration:none;border-bottom:1px solid currentColor}
.btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#1a1a1a;color:#fff;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;border:none}
.btn:hover{background:#8b3a2f}
</style>
</head><body>
  <div class="card">
    <h1>${icon} WhatsApp</h1>
    <p>${msg}</p>
    <p><a class="btn" href="${baseUrl}/admin">← Back to admin</a></p>
  </div>
</body></html>`;
}
