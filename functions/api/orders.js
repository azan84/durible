// POST /api/orders — receives the Durible3D order form, writes to D1, uploads files to R2.
// Bindings required (configured in Cloudflare Pages dashboard):
//   env.DB      -> D1 database binding named "DB"
//   env.BUCKET  -> R2 bucket binding named "BUCKET"

const UNIT_PRICE = 20;
const SHIPPING_COST = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const VALID_DEPARTMENTS = new Set(['ECE', 'MEC', 'MCT', 'BTE', 'MME', 'CIVE', 'Do not include']);

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

async function uploadFile(bucket, file, prefix, keyBase) {
  if (!file || typeof file.arrayBuffer !== 'function') return null;
  if (file.size === 0) return null;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${prefix} file exceeds 10 MB limit.`);
  }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
  const key = `${prefix}/${keyBase}.${ext}`;
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

    // ---- Top-level buyer fields ----
    const full_name = (form.get('full_name') || '').toString().trim();
    const email = (form.get('email') || '').toString().trim();
    const contact_number = (form.get('contact_number') || '').toString().trim();
    const quantity = parseInt(form.get('quantity') || '0', 10);
    const shipping_method = (form.get('shipping_method') || 'collect').toString().trim();
    const mailing_address = (form.get('mailing_address') || '').toString().trim();
    const notes = (form.get('notes') || '').toString().trim();

    if (!full_name) return jsonResponse({ error: 'Full name is required.' }, 400);
    if (!email || !email.includes('@'))
      return jsonResponse({ error: 'Valid email is required.' }, 400);
    if (!contact_number)
      return jsonResponse({ error: 'Contact number is required.' }, 400);
    if (!(quantity >= 1 && quantity <= 10))
      return jsonResponse({ error: 'Quantity must be between 1 and 10.' }, 400);
    if (!['collect', 'standard'].includes(shipping_method))
      return jsonResponse({ error: 'Invalid shipping method.' }, 400);
    if (shipping_method === 'standard' && !mailing_address)
      return jsonResponse(
        { error: 'Mailing address is required for standard shipping.' },
        400
      );

    // ---- Per-item fields ----
    const items = [];
    for (let i = 0; i < quantity; i++) {
      const department = (form.get(`item_${i}_department`) || '').toString().trim();
      const engraving_type = (form.get(`item_${i}_engraving_type`) || '').toString().trim();
      const engraving_value = (form.get(`item_${i}_engraving_value`) || '').toString().trim();
      const avatar_choice = (form.get(`item_${i}_avatar_choice`) || '').toString().trim();

      if (!department || !VALID_DEPARTMENTS.has(department)) {
        return jsonResponse(
          { error: `Keychain #${i + 1}: invalid or missing department.` },
          400
        );
      }
      if (!['batch', 'matric'].includes(engraving_type)) {
        return jsonResponse(
          { error: `Keychain #${i + 1}: invalid engraving type.` },
          400
        );
      }
      if (!engraving_value) {
        return jsonResponse(
          { error: `Keychain #${i + 1}: engraving value is required.` },
          400
        );
      }
      if (!['male', 'female', 'custom'].includes(avatar_choice)) {
        return jsonResponse(
          { error: `Keychain #${i + 1}: invalid avatar choice.` },
          400
        );
      }
      items.push({
        index: i,
        department,
        engraving_type,
        engraving_value,
        avatar_choice,
        avatar_file: form.get(`item_${i}_avatar_file`),
      });
    }

    // ---- Payment slip required ----
    const slipFile = form.get('payment_slip');
    if (!slipFile || (slipFile.size !== undefined && slipFile.size === 0)) {
      return jsonResponse({ error: 'Payment slip is required.' }, 400);
    }

    // ---- Compute totals & generate ID ----
    const unit_total = quantity * UNIT_PRICE;
    const shipping_total = shipping_method === 'standard' ? SHIPPING_COST : 0;
    const total_amount = unit_total + shipping_total;
    const order_id = genOrderId();

    // ---- Upload files to R2 ----
    let payment_slip_key = null;
    try {
      payment_slip_key = await uploadFile(env.BUCKET, slipFile, 'payments', order_id);
    } catch (uploadErr) {
      return jsonResponse({ error: uploadErr.message }, 400);
    }

    // Upload each custom avatar (if any)
    for (const it of items) {
      if (it.avatar_choice === 'custom' && it.avatar_file && it.avatar_file.size > 0) {
        try {
          it.avatar_key = await uploadFile(
            env.BUCKET,
            it.avatar_file,
            'avatars',
            `${order_id}_item${it.index}`
          );
        } catch (uploadErr) {
          return jsonResponse(
            { error: `Keychain #${it.index + 1}: ${uploadErr.message}` },
            400
          );
        }
      } else {
        it.avatar_key = null;
      }
    }

    // ---- Insert order + items atomically via D1 batch ----
    const orderStmt = env.DB.prepare(
      `INSERT INTO orders (
        order_id, full_name, email, contact_number, quantity,
        shipping_method, mailing_address, notes, payment_slip_key,
        unit_price, shipping_cost, total_amount, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      order_id,
      full_name,
      email,
      contact_number,
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
    );

    const itemStmts = items.map((it) =>
      env.DB.prepare(
        `INSERT INTO order_items (
          order_id, item_index, department, engraving_type, engraving_value,
          avatar_choice, avatar_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        order_id,
        it.index,
        it.department,
        it.engraving_type,
        it.engraving_value,
        it.avatar_choice,
        it.avatar_key
      )
    );

    await env.DB.batch([orderStmt, ...itemStmts]);

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
