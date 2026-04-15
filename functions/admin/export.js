// GET /admin/export.csv?status=...&product=...
// Downloads all orders matching the current filters as a CSV file.
// Respects the same filters as the dashboard so what you see is what you export.
// Includes a UTF-8 BOM so Excel opens it with correct character encoding.

const VALID_STATUS = ['pending', 'confirmed', 'shipped', 'cancelled'];
const VALID_PRODUCT = ['keychain', 'bizcard', 'cablewinder', 'bagtag'];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const filterStatus = (url.searchParams.get('status') || '').trim();
  const filterProduct = (url.searchParams.get('product') || '').trim();

  let query = 'SELECT * FROM orders';
  const wheres = [];
  const binds = [];
  if (VALID_STATUS.includes(filterStatus)) {
    wheres.push('status = ?');
    binds.push(filterStatus);
  }
  if (VALID_PRODUCT.includes(filterProduct)) {
    wheres.push('product_type = ?');
    binds.push(filterProduct);
  }
  if (wheres.length) query += ' WHERE ' + wheres.join(' AND ');
  query += ' ORDER BY id DESC';

  const { results: orders } = await env.DB.prepare(query).bind(...binds).all();

  // Fetch all keychain items in one query, group by order_id
  let itemsByOrder = {};
  if (orders.length > 0) {
    const { results: items } = await env.DB.prepare(
      'SELECT * FROM order_items ORDER BY order_id, item_index'
    ).all();
    for (const it of items) {
      (itemsByOrder[it.order_id] ||= []).push(it);
    }
  }

  const headers = [
    'Order ID',
    'Created At (UTC)',
    'Product',
    'Buyer Name',
    'Phone',
    'Email',
    'Quantity',
    'Shipping',
    'Mailing Address',
    'Unit Price (RM)',
    'Shipping Cost (RM)',
    'Total (RM)',
    'Status',
    'Notes',
    'Details',
    'Payment Slip Key',
    'Logo Key',
  ];

  const rows = [headers];

  for (const o of orders) {
    let details = '';
    if (o.product_type === 'keychain') {
      const items = itemsByOrder[o.order_id] || [];
      details = items
        .map(
          (it, i) =>
            `#${i + 1}: dept=${it.department}; engraving=${it.engraving_value}; avatar=${it.avatar_choice}${
              it.avatar_key ? ' (custom)' : ''
            }`
        )
        .join(' | ');
    } else if (o.product_type === 'bizcard') {
      try {
        const d = JSON.parse(o.details_json || '{}');
        if (d.company_address) details = 'Company: ' + d.company_address;
      } catch {}
    } else if (o.product_type === 'cablewinder' && o.logo_key) {
      details = 'Logo: ' + o.logo_key;
    }

    rows.push([
      o.order_id,
      o.created_at,
      o.product_name || o.product_type,
      o.full_name,
      o.contact_number,
      o.email || '',
      o.quantity,
      o.shipping_method,
      o.mailing_address || '',
      o.unit_price,
      o.shipping_cost,
      o.total_amount,
      o.status,
      o.notes || '',
      details,
      o.payment_slip_key || '',
      o.logo_key || '',
    ]);
  }

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  // UTF-8 BOM for Excel
  const body = '\uFEFF' + csv;

  const now = new Date();
  const stamp =
    now.getUTCFullYear() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0') +
    '-' +
    String(now.getUTCHours()).padStart(2, '0') +
    String(now.getUTCMinutes()).padStart(2, '0');

  let filenameBase = 'durible-orders';
  if (filterStatus || filterProduct) {
    const parts = [filterProduct, filterStatus].filter(Boolean);
    filenameBase += '-' + parts.join('-');
  }
  const filename = `${filenameBase}-${stamp}.csv`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Quote if the cell contains comma, quote, CR, or LF. Escape embedded quotes.
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
