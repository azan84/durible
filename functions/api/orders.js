// POST /api/orders — unified endpoint for all Durible3D products.
// The request must include a `product_type` field; different product types
// have different required fields (validated below).
//
// Bindings required (set in Cloudflare Pages dashboard):
//   env.DB      -> D1 database binding "DB"
//   env.BUCKET  -> R2 bucket binding "BUCKET"

const SHIPPING_COST = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const PRODUCT_CATALOG = {
  keychain: { name: 'Personalised KOE Alumni Keychain', price: 20 },
  bizcard: { name: '3D Printed Smart Business Card', price: 40 },
  cablewinder: { name: 'Custom Cable Winder', price: 20 },
  bagtag: { name: 'Personalised Bag Tag', price: 20 },
};

const VALID_DEPARTMENTS = new Set([
  'ECE',
  'MEC',
  'MCT',
  'BTE',
  'MME',
  'CIVE',
  'Do not include',
]);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function genOrderId() {
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

function str(form, field) {
  return (form.get(field) || '').toString().trim();
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

    const product_type = str(form, 'product_type');
    const product = PRODUCT_CATALOG[product_type];
    if (!product) {
      return jsonResponse({ error: 'Unknown product type.' }, 400);
    }

    // ---- Common buyer fields ----
    const full_name = str(form, 'full_name');
    const contact_number = str(form, 'contact_number');
    const email = str(form, 'email');
    const quantity = parseInt(form.get('quantity') || '0', 10);
    const shipping_method = str(form, 'shipping_method') || 'collect';
    const mailing_address = str(form, 'mailing_address');
    const notes = str(form, 'notes');

    if (!full_name) return jsonResponse({ error: 'Full name is required.' }, 400);
    if (!contact_number)
      return jsonResponse({ error: 'Contact number is required.' }, 400);
    if (!(quantity >= 1 && quantity <= 20))
      return jsonResponse({ error: 'Quantity must be between 1 and 20.' }, 400);
    if (!['collect', 'standard'].includes(shipping_method))
      return jsonResponse({ error: 'Invalid shipping method.' }, 400);
    if (shipping_method === 'standard' && !mailing_address)
      return jsonResponse(
        { error: 'Mailing address is required for standard shipping.' },
        400
      );

    // ---- Product-specific validation + details_json ----
    let details_json = null;
    let items = null; // only for keychain
    let logoFile = null; // only for cablewinder

    if (product_type === 'keychain') {
      items = [];
      for (let i = 0; i < quantity; i++) {
        const department = str(form, `item_${i}_department`);
        const engraving_value = str(form, `item_${i}_engraving_value`);
        const avatar_choice = str(form, `item_${i}_avatar_choice`);
        if (!department || !VALID_DEPARTMENTS.has(department)) {
          return jsonResponse(
            { error: `Keychain #${i + 1}: invalid or missing department.` },
            400
          );
        }
        if (!engraving_value) {
          return jsonResponse(
            { error: `Keychain #${i + 1}: Batch/Matric number is required.` },
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
          engraving_value,
          avatar_choice,
          avatar_file: form.get(`item_${i}_avatar_file`),
        });
      }
    } else if (product_type === 'bizcard') {
      if (!email || !email.includes('@'))
        return jsonResponse({ error: 'Valid email is required.' }, 400);
      const company_address = str(form, 'company_address');
      if (!company_address)
        return jsonResponse({ error: 'Company address is required.' }, 400);
      details_json = JSON.stringify({ company_address });
    } else if (product_type === 'cablewinder') {
      logoFile = form.get('logo_file');
      if (!logoFile || (logoFile.size !== undefined && logoFile.size === 0)) {
        return jsonResponse({ error: 'Logo image upload is required.' }, 400);
      }
      details_json = JSON.stringify({});
    } else if (product_type === 'bagtag') {
      // name + phone already captured as full_name + contact_number
      details_json = JSON.stringify({});
    }

    // ---- Payment slip ----
    const slipFile = form.get('payment_slip');
    if (!slipFile || (slipFile.size !== undefined && slipFile.size === 0)) {
      return jsonResponse({ error: 'Payment slip is required.' }, 400);
    }

    // ---- Totals ----
    const unit_total = quantity * product.price;
    const shipping_total = shipping_method === 'standard' ? SHIPPING_COST : 0;
    const total_amount = unit_total + shipping_total;
    const order_id = genOrderId();

    // ---- Uploads ----
    let payment_slip_key = null;
    let logo_key = null;
    try {
      payment_slip_key = await uploadFile(env.BUCKET, slipFile, 'payments', order_id);
      if (logoFile) {
        logo_key = await uploadFile(env.BUCKET, logoFile, 'logos', order_id);
      }
      if (items) {
        for (const it of items) {
          if (it.avatar_choice === 'custom' && it.avatar_file && it.avatar_file.size > 0) {
            it.avatar_key = await uploadFile(
              env.BUCKET,
              it.avatar_file,
              'avatars',
              `${order_id}_item${it.index}`
            );
          } else {
            it.avatar_key = null;
          }
        }
      }
    } catch (uploadErr) {
      return jsonResponse({ error: uploadErr.message }, 400);
    }

    // ---- D1 insert ----
    const orderStmt = env.DB.prepare(
      `INSERT INTO orders (
        order_id, product_type, product_name, full_name, email, contact_number,
        quantity, shipping_method, mailing_address, notes, payment_slip_key,
        logo_key, unit_price, shipping_cost, total_amount, status,
        details_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      order_id,
      product_type,
      product.name,
      full_name,
      email || null,
      contact_number,
      quantity,
      shipping_method,
      mailing_address,
      notes,
      payment_slip_key,
      logo_key,
      product.price,
      shipping_total,
      total_amount,
      'pending',
      details_json,
      new Date().toISOString()
    );

    const stmts = [orderStmt];
    if (items) {
      for (const it of items) {
        stmts.push(
          env.DB.prepare(
            `INSERT INTO order_items (
              order_id, item_index, department, engraving_value,
              avatar_choice, avatar_key
            ) VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            order_id,
            it.index,
            it.department,
            it.engraving_value,
            it.avatar_choice,
            it.avatar_key
          )
        );
      }
    }

    await env.DB.batch(stmts);

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
