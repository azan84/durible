// POST /api/pilot — captures pilot-programme applications for Durible
// (Ordo's in-development durian-skin + PLA biocomposite filament).
//
// Distinct from /api/orders: these are leads, not paid orders, and they
// live in their own D1 table (`pilot_leads`) so we don't have to shoehorn
// them into the order schema.
//
// Bindings: env.DB (D1 "DB"). Optional secrets WHATSAPP_PHONE +
// CALLMEBOT_API_KEY for operator notification (best-effort).

import { sendWhatsApp, buildPilotMessage } from '../_lib/whatsapp.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function genPilotId() {
  const d = new Date();
  const yymmdd =
    String(d.getUTCFullYear()).slice(2) +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `PLT-${yymmdd}-${rand}`;
}

function getField(body, key) {
  const v = body[key];
  return typeof v === 'string' ? v.trim() : '';
}

// RFC-5322-ish: lightweight check, matches the shape the order endpoint uses
// for bizcard emails. Not trying to be exhaustive — a real typo gets filtered
// out by the manual follow-up anyway.
function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function readBody(request) {
  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }
  // multipart/form-data or application/x-www-form-urlencoded
  try {
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
  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Server misconfigured: DB binding missing.' }, 500);
    }

    const body = await readBody(request);
    if (!body) return jsonResponse({ error: 'Unreadable request body.' }, 400);

    const company_name = getField(body, 'company_name');
    const contact_name = getField(body, 'contact_name');
    const email = getField(body, 'email');
    const phone = getField(body, 'phone');
    const use_case = getField(body, 'use_case');
    const notes = getField(body, 'notes');

    if (!company_name) return jsonResponse({ error: 'Company name is required.' }, 400);
    if (!contact_name) return jsonResponse({ error: 'Contact name is required.' }, 400);
    if (!email || !looksLikeEmail(email))
      return jsonResponse({ error: 'A valid email is required.' }, 400);
    if (!phone) return jsonResponse({ error: 'Phone is required.' }, 400);
    if (!use_case) return jsonResponse({ error: 'Please describe your use case.' }, 400);

    const pilot_id = genPilotId();
    const created_at = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO pilot_leads (
        pilot_id, company_name, contact_name, email, phone,
        use_case, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        pilot_id,
        company_name,
        contact_name,
        email,
        phone,
        use_case || null,
        notes || null,
        'new',
        created_at
      )
      .run();

    // Fire-and-forget WhatsApp notification — never blocks the response.
    try {
      const baseUrl = new URL(request.url).origin;
      const text = buildPilotMessage(
        {
          pilot_id,
          company_name,
          contact_name,
          email,
          phone,
          use_case,
          notes,
          created_at,
        },
        { baseUrl }
      );
      const promise = sendWhatsApp(env, text).catch(() => {});
      if (context && typeof context.waitUntil === 'function') {
        context.waitUntil(promise);
      } else {
        await promise;
      }
    } catch {
      // Never fail a pilot submission over a notification problem.
    }

    return jsonResponse({ ok: true, pilot_id });
  } catch (err) {
    return jsonResponse(
      { error: 'Internal error: ' + (err.message || 'unknown') },
      500
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
