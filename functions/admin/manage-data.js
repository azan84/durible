// GET  /admin/manage-data — returns the Ordo Admin app's saved state.
// POST /admin/manage-data — overwrites it.
// Single-row key/value blob in D1 (see migrations/2026-07-28-admin-kv.sql).
// Mirrors the shape of the Claude-artifact window.storage API this tool
// used to run on: GET -> { value } , POST body is the raw JSON string.

const KEY = 'ordo-core-v1';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — generous for this app's data

// Idempotent, so the endpoint works even if the migration hasn't been applied
// to whichever D1 instance this deployment is bound to.
async function ensureTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS admin_kv (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL,
       updated_at TEXT NOT NULL
     )`
  ).run();
}

export async function onRequestGet({ env }) {
  await ensureTable(env);

  const row = await env.DB.prepare('SELECT value FROM admin_kv WHERE key = ?')
    .bind(KEY)
    .first();

  return Response.json({ value: row ? row.value : null });
}

export async function onRequestPost({ request, env }) {
  const body = await request.text();

  if (body.length > MAX_BYTES) {
    return new Response('Payload too large', { status: 413 });
  }

  try {
    JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  await ensureTable(env);

  await env.DB.prepare(
    `INSERT INTO admin_kv (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(KEY, body, new Date().toISOString())
    .run();

  return Response.json({ ok: true });
}
