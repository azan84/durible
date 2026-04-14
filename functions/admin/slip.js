// GET /admin/slip?key=payments/DUR-XXX.jpg — streams an R2 object.
// Used by the admin dashboard to view payment slips, avatars, and logos.
// Only objects under known prefixes are allowed, to prevent arbitrary reads.

const ALLOWED_PREFIXES = ['payments/', 'avatars/', 'logos/'];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) {
    return new Response('Missing "key" parameter', { status: 400 });
  }
  if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    return new Response('Forbidden', { status: 403 });
  }
  if (key.includes('..')) {
    return new Response('Forbidden', { status: 403 });
  }

  const obj = await env.BUCKET.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  const ct = obj.httpMetadata && obj.httpMetadata.contentType;
  headers.set('Content-Type', ct || 'application/octet-stream');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Disposition', `inline; filename="${key.split('/').pop()}"`);

  return new Response(obj.body, { headers });
}
