// Transactional email via Resend (https://resend.com) — plain fetch, no SDK.
//
// Secrets / vars (Pages project > Settings > Variables and Secrets):
//   RESEND_API_KEY      required — without it sendEmail() is a no-op
//   ENQUIRY_EMAIL_FROM  optional — must be on a domain verified in Resend,
//                       default "Ordo website <enquiries@ordo.earth>"
//
// Never throws; returns { ok, reason?, id? } so callers can log and move on.

export async function sendEmail(env, { to, subject, text, html, replyTo }) {
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
