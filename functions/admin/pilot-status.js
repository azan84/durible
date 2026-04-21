// POST /admin/pilot-status — updates a pilot lead's status.
// Body: pilot_id, status (one of new|contacted|piloting|closed)
// Redirects back to /admin/pilots with a flash query param.

const VALID_STATUS = ['new', 'contacted', 'piloting', 'closed'];

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return redirect(request, { error: 'bad_form' });
  }

  const pilot_id = (form.get('pilot_id') || '').toString().trim();
  const status = (form.get('status') || '').toString().trim();

  if (!pilot_id) return redirect(request, { error: 'missing_pilot_id' });
  if (!VALID_STATUS.includes(status)) return redirect(request, { error: 'bad_status' });

  const result = await env.DB.prepare(
    'UPDATE pilot_leads SET status = ? WHERE pilot_id = ?'
  )
    .bind(status, pilot_id)
    .run();

  if (!result.success || result.meta.changes === 0) {
    return redirect(request, { error: 'not_found', updated: pilot_id });
  }

  return redirect(request, { updated: pilot_id });
}

function redirect(request, params) {
  const url = new URL('/admin/pilots', request.url);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return Response.redirect(url.toString(), 303);
}
