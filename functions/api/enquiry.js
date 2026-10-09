// POST /api/enquiry — project enquiries from /contact and /custom-projects.
//
// Each enquiry is:
//   1. stored in D1 `pilot_leads` (pilot_id prefixed ENQ-, so it shows up in
//      /admin/pilots without a schema change),
//   2. emailed to ENQUIRY_EMAIL_TO (default nabilah@constellation.my) with the
//      customer as Reply-To — see _lib/email.js for the RESEND_API_KEY secret,
//   3. pinged to WhatsApp via CallMeBot when configured (best-effort).
//
// The request succeeds if the enquiry was stored OR emailed; it only fails
// when neither worked, so the visitor is never told "sent" for a lost lead.

import { sendWhatsApp } from '../_lib/whatsapp.js';
import { sendEmail } from '../_lib/email.js';

const DEFAULT_TO = 'nabilah@constellation.my';
const INTERESTS = ['Ordo Connect', 'Ordo Life', 'Ordo Collections', 'Custom project', 'General enquiry'];
const LIMITS = { name: 120, company: 160, email: 200, phone: 40, product: 160, message: 4000 };

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function genEnquiryId() {
  const d = new Date();
  const yymmdd =
    String(d.getUTCFullYear()).slice(2) +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `ENQ-${yymmdd}-${rand}`;
}

// Single-line fields lose CR/LF so nothing user-supplied can break out of
// an email header (subject) or the WhatsApp summary line.
function field(body, key) {
  const v = body[key];
  if (typeof v !== 'string') return '';
  const clean = key === 'message' ? v : v.replace(/[\r\n\t]+/g, ' ');
  return clean.trim().slice(0, LIMITS[key] || 200);
}

function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmail(e, baseUrl) {
  const rows = [
    ['Reference', e.enquiry_id],
    ['Name', e.name],
    ['Company', e.company || '—'],
    ['Email', e.email],
    ['Phone', e.phone || '—'],
    ['Interested in', e.interest],
    ...(e.product ? [['Product', e.product]] : []),
    ['Received', new Date(e.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })],
  ];
  const text = [
    `New enquiry from ordo.earth (${e.enquiry_id})`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Message:',
    e.message,
    '',
    `Reply to this email to answer ${e.name} directly.`,
    `Admin: ${baseUrl}/admin/pilots`,
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;color:#252827;max-width:600px">
<h2 style="color:#164e52;margin:0 0 16px">New enquiry from ordo.earth</h2>
<table style="border-collapse:collapse;width:100%;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5c625f;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>
<h3 style="color:#164e52;margin:20px 0 8px;font-size:15px">Message</h3>
<p style="white-space:pre-wrap;background:#f5f1e8;padding:14px;border-radius:10px;margin:0">${escapeHtml(e.message)}</p>
<p style="font-size:13px;color:#5c625f;margin-top:20px">Reply to this email to answer ${escapeHtml(e.name)} directly.</p>
</div>`;
  return { text, html };
}

async function readBody(request) {
  const ct = request.headers.get('Content-Type') || '';
  try {
    if (ct.includes('application/json')) return await request.json();
    const fd = await request.formData();
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = typeof v === 'string' ? v : '';
    return obj;
  } catch {
    return null;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await readBody(request);
  if (!body || typeof body !== 'object') return jsonResponse({ error: 'Unreadable request body.' }, 400);

  // Bot checks — pretend success, store nothing:
  //  - honeypot: bots fill every field
  //  - dwell time: the page reports ms since load; humans need > 2.5 s
  const dwell = Number(body.t);
  if (field(body, 'website') || !Number.isFinite(dwell) || dwell < 2500) {
    return jsonResponse({ ok: true, enquiry_id: genEnquiryId() });
  }

  const e = {
    name: field(body, 'name'),
    company: field(body, 'company'),
    email: field(body, 'email'),
    phone: field(body, 'phone'),
    interest: field(body, 'interest'),
    product: field(body, 'product'),
    message: field(body, 'message'),
  };

  if (!e.name) return jsonResponse({ error: 'Enter your name.', field: 'name' }, 400);
  if (!looksLikeEmail(e.email)) return jsonResponse({ error: 'Enter a valid email address, like name@company.com.', field: 'email' }, 400);
  if (!INTERESTS.includes(e.interest)) return jsonResponse({ error: 'Choose what you’re interested in.', field: 'interest' }, 400);
  if (e.message.length < 5) return jsonResponse({ error: 'Add a short message about your project.', field: 'message' }, 400);

  e.enquiry_id = genEnquiryId();
  e.created_at = new Date().toISOString();
  const baseUrl = new URL(request.url).origin;

  // 1. Throttle (max 3 per email per 15 min), then store
  let stored = false;
  if (env.DB) {
    try {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const recent = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM pilot_leads WHERE email = ? AND pilot_id LIKE 'ENQ-%' AND created_at > ?`
      ).bind(e.email, since).first();
      if (recent && recent.n >= 3) {
        return jsonResponse({ error: 'We’ve already received several enquiries from this email. We’ll be in touch — or message us on WhatsApp at +60 10-792 4208.' }, 429);
      }
    } catch (err) {
      console.error('enquiry: throttle check failed', err && err.message);
    }
    try {
      await env.DB.prepare(
        `INSERT INTO pilot_leads (
          pilot_id, company_name, contact_name, email, phone,
          use_case, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          e.enquiry_id,
          e.company || '—',
          e.name,
          e.email,
          e.phone,
          `[${e.interest}] ${e.message}`,
          ['Source: website enquiry', e.product && `Product: ${e.product}`].filter(Boolean).join(' · '),
          'new',
          e.created_at
        )
        .run();
      stored = true;
    } catch (err) {
      console.error('enquiry: D1 insert failed', err && err.message);
    }
  }

  // 2. Email (awaited — it decides success when D1 is unavailable)
  const { text, html } = buildEmail(e, baseUrl);
  const mail = await sendEmail(env, {
    to: (env.ENQUIRY_EMAIL_TO || DEFAULT_TO).split(',').map((s) => s.trim()).filter(Boolean),
    subject: `New enquiry: ${e.interest}${e.product ? ` — ${e.product}` : ''} (${e.name})`,
    text,
    html,
    replyTo: e.email,
  });
  if (!mail.ok) {
    console.error('enquiry: email not sent', mail.reason);
    // Flag the stored lead so staff can see it never reached the inbox.
    if (stored) {
      try {
        await env.DB.prepare(`UPDATE pilot_leads SET notes = notes || ? WHERE pilot_id = ?`)
          .bind(` · Email NOT forwarded (${mail.reason})`, e.enquiry_id).run();
      } catch {}
    }
  }

  if (!stored && !mail.ok) {
    return jsonResponse(
      { error: 'We couldn’t send your enquiry just now. Please try again, or message us on WhatsApp at +60 10-792 4208.' },
      503
    );
  }

  // 3. WhatsApp ping — fire-and-forget
  const wa = sendWhatsApp(
    env,
    `📨 New enquiry ${e.enquiry_id}\n${e.name}${e.company ? ` (${e.company})` : ''}\n${e.email}${e.phone ? ` · ${e.phone}` : ''}\n${e.interest}${e.product ? ` — ${e.product}` : ''}\n\n${e.message.slice(0, 500)}`
  ).catch(() => {});
  if (typeof context.waitUntil === 'function') context.waitUntil(wa);

  return jsonResponse({ ok: true, enquiry_id: e.enquiry_id });
}
