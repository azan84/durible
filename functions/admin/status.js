// POST /admin/status — updates an order's status.
// Body: order_id, status (one of pending|confirmed|shipped|cancelled)
// Redirects back to /admin with a flash query param.

const VALID_STATUS = ['pending', 'confirmed', 'shipped', 'cancelled'];

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return redirect(request, { error: 'bad_form' });
  }

  const order_id = (form.get('order_id') || '').toString().trim();
  const status = (form.get('status') || '').toString().trim();

  if (!order_id) return redirect(request, { error: 'missing_order_id' });
  if (!VALID_STATUS.includes(status)) return redirect(request, { error: 'bad_status' });

  const result = await env.DB.prepare(
    'UPDATE orders SET status = ? WHERE order_id = ?'
  )
    .bind(status, order_id)
    .run();

  if (!result.success || result.meta.changes === 0) {
    return redirect(request, { error: 'not_found', updated: order_id });
  }

  return redirect(request, { updated: order_id });
}

function redirect(request, params) {
  const url = new URL('/admin', request.url);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return Response.redirect(url.toString(), 303);
}
