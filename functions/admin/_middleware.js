// HTTP Basic Auth gate for all /admin/* routes.
// Set the password once with:
//   wrangler pages secret put ADMIN_PASSWORD --project-name=durible
// Username is ignored — any username with the correct password lets you in.

export async function onRequest({ request, env, next }) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) {
    return new Response(
      'Admin password not set. Run:\n\n  wrangler pages secret put ADMIN_PASSWORD --project-name=durible\n',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Basic ')) {
    return unauthorized();
  }

  let pass = '';
  try {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(':');
    pass = idx === -1 ? decoded : decoded.slice(idx + 1);
  } catch {
    return unauthorized();
  }

  // constant-time compare (good enough for a single password)
  if (pass.length !== expected.length) return unauthorized();
  let diff = 0;
  for (let i = 0; i < pass.length; i++) diff |= pass.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return unauthorized();

  return next();
}

function unauthorized() {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Durible Admin", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
