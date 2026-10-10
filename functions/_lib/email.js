// Transactional email for website enquiries.
//
// Primary: env.MAILER — service binding to the private `ordo-mailer` Worker
// (workers/ordo-mailer), which sends through Cloudflare Email Routing to the
// verified destination nabilah@constellation.my. Configured in wrangler.toml.
//
// Fallback: Resend (https://resend.com), used only if MAILER is missing and
// RESEND_API_KEY is set; ENQUIRY_EMAIL_FROM overrides the sender.
//
// Never throws; returns { ok, reason?, id? } so callers can log and move on.

export async function sendEmail(env, { to, subject, text, html, replyTo }) {
  if (env.MAILER) {
    try {
      const res = await env.MAILER.fetch('https://ordo-mailer/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, text, html, replyTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) return { ok: true };
      return { ok: false, reason: data.error || `mailer_http_${res.status}` };
    } catch (err) {
      return { ok: false, reason: 'mailer: ' + (err.message || 'fetch_failed') };
    }
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'email_not_configured' };

  const from = env.ENQUIRY_EMAIL_FROM || 'Ordo website <enquiries@ordo.earth>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, reason: data.message || `http_${res.status}` };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, reason: err.message || 'fetch_failed' };
  }
}
