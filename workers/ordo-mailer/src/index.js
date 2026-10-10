// ordo-mailer — sends one email per POST to the fixed, verified destination
// bound as env.NABILAH. Called only by the Pages Function /api/enquiry via a
// service binding; it has no public route.
//
// Body (JSON): { subject, text, html?, replyTo? }
// Response:    { ok: true } or { ok: false, error }

import { EmailMessage } from 'cloudflare:email';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Header values must be a single line; RFC 2047-encode anything non-ASCII.
function headerText(s) {
  const flat = String(s || '').replace(/[\r\n]+/g, ' ').trim();
  return /^[\x20-\x7e]*$/.test(flat) ? flat : `=?UTF-8?B?${b64(flat)}?=`;
}

function b64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// base64 body wrapped at 76 chars, as MIME requires
const b64Body = (s) => b64(s).replace(/.{1,76}/g, '$&\r\n');

const isEmail = (s) => /^[^\s@<>",]+@[^\s@<>",]+\.[^\s@<>",]+$/.test(s || '');

function buildMime({ from, fromName, to, subject, text, html, replyTo, domain }) {
  const boundary = 'ordo-' + crypto.randomUUID();
  const headers = [
    `From: ${headerText(fromName)} <${from}>`,
    `To: <${to}>`,
    ...(isEmail(replyTo) ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${headerText(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
  ];
  if (!html) {
    return [...headers, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64Body(text)].join('\r\n');
  }
  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64Body(text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64Body(html),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'bad_json' }, 400);
    }
    if (!body || !body.subject || !body.text) return json({ ok: false, error: 'missing_fields' }, 400);

    const from = env.FROM_ADDRESS;
    const to = 'nabilah@constellation.my'; // must match the binding's destination_address
    const raw = buildMime({
      from,
      fromName: env.FROM_NAME,
      to,
      subject: body.subject,
      text: body.text,
      html: body.html,
      replyTo: body.replyTo,
      domain: from.split('@')[1],
    });
    try {
      await env.NABILAH.send(new EmailMessage(from, to, raw));
      return json({ ok: true });
    } catch (err) {
      return json({ ok: false, error: err.message || 'send_failed' }, 502);
    }
  },
};
