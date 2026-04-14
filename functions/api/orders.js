// POST /api/orders — receives the Durible3D order form, writes to D1, uploads files to R2.
// Bindings required (configured in Cloudflare Pages dashboard):
//   env.DB      -> D1 database binding named "DB"
//   env.BUCKET  -> R2 bucket binding named "BUCKET"

const UNIT_PRICE = 20;
const SHIPPING_COST = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function genOrderId() {
  // e.g. DUR-240415-A7K9
  const d = new Date();
  const yymmdd =
    String(d.getUTCFullYear()).slice(2) +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `DUR-${yymmdd}-${rand}`;
}

async function uploadFile(bucket, file, prefix, orderId) {
  if (!file || typeof file.arrayBuffer !== 'function') return null;
  if (file.size === 0) return null;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${prefix} file exceeds 10 MB limit.`);
  }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
  const key = `${prefix}/${orderId}.${ext}`;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
    customMetadata: { originalName: file.name || '' },
  });
  return key;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB || !env.BUCKET) {
      return jsonResponse(
        { error: 'Server misconfigured: DB or BUCKET binding missing.' },
        500
      );
    }

    const form = await request.formData();

    // Extract + validate fields
    const full_name = (form.get('full_name') || '').toString().trim();
    const email = (form.get('email') || '').toString().trim();
    const contact_number = (form.get('contact_number') || '').toString().trim();
    const departments = (form.get('departments') || '').toString().trim();
    const batches = (form.get('batches') || '').toString().trim();
    const avatar_choice = (form.get('avatar_choice') || '').toString().trim();
    const quantity = parseInt(form.get('quantity') || '1', 10);
    const shipping_method = (form.get('shipping_method') || 'collect').toString().trim();
    const mailing_address = (form.get('mailing_address') || '').toString().trim();
    const notes = (form.get('notes') || '').toString().trim();

    if (!full_name) return jsonResponse({ error: 'Full name is required.' }, 400);
    if (!email || !email.includes('@'))
      return jsonResponse({ error: 'Valid email is required.' }, 400);
    if (!contact_number)
      return jsonResponse({ error: 'Contact number is required.' }, 400);
    if (!departments)
      return jsonResponse({ error: 'Select at least one department.' }, 400);
    if (!batches) return jsonResponse({ error: 'Select at least one batch.' }, 400);
    if (!['male', 'female', 'custom'].includes(avatar_choice))
      return jsonResponse({ error: 'Pick an avatar option.' }, 400);
    if (!(quantity >= 1 && quantity <= 10))
      return jsonResponse({ error: 'Quantity must be between 1 and 10.' }, 400);
    if (!['collect', 'standard'].includes(shipping_method))
      return jsonResponse({ error: 'Invalid shipping method.' }, 400);
    if (shipping_method === 'standard' && !mailing_address)
      return jsonResponse(
        { error: 'Mailing address is required for standard shipping.' },
        400
      );

    const unit_total = quantity * UNIT_PRICE;
    const shipping_total = shipping_method === 'standard' ? SHIPPING_COST : 0;
    const total_amount = unit_total + shipping_total;

    const order_id = genOrderId();

    // Upload files to R2 (keyed by order_id)
    const avatarFile = form.get('avatar_file');
    const slipFile = form.get('payment_slip');

    if (!slipFile || (slipFile.size && slipFile.size === 0)) {
      return jsonResponse({ error: 'Payment slip is required.' }, 400);
    }

    let avatar_key = null;
    let payment_slip_key = null;
    try {
      avatar_key = await uploadFile(env.BUCKET, avatarFile, 'avatars', order_id);
      payment_slip_key = await uploadFile(env.BUCKET, slipFile, 'payments', order_id);
    } catch (uploadErr) {
      return jsonResponse({ error: uploadErr.message }, 400);
    }

    // Insert into D1
    await env.DB.prepare(
      `INSERT INTO orders (
        order_id, full_name, email, contact_number, departments, batches,
        avatar_choice, avatar_key, quantity, shipping_method, mailing_address,
        notes, payment_slip_key, unit_price, shipping_cost, total_amount,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        order_id,
        full_name,
        email,
        contact_number,
        departments,
        batches,
        avatar_choice,
        avatar_key,
        quantity,
        shipping_method,
        mailing_address,
        notes,
        payment_slip_key,
        UNIT_PRICE,
        shipping_total,
        total_amount,
        'pending',
        new Date().toISOString()
      )
      .run();

    return jsonResponse({
      ok: true,
      order_id,
      total_amount,
      message: 'Order received.',
    });
  } catch (err) {
    return jsonResponse(
      { error: 'Internal error: ' + (err.message || 'unknown') },
      500
    );
  }
}

// Optional: CORS preflight (same origin so usually not needed, but safe)
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
