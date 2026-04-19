// GET /admin/receipt?id=DUR-XXX
// Returns a print-ready HTML receipt for a single order.
// Loads from D1 (orders + order_items) so it always reflects the latest data.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();
  if (!id) {
    return new Response('Missing ?id=DUR-XXX parameter', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const order = await env.DB.prepare('SELECT * FROM orders WHERE order_id = ?')
    .bind(id)
    .first();
  if (!order) {
    return new Response('Order not found: ' + id, {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  let items = [];
  if (order.product_type === 'keychain') {
    const r = await env.DB.prepare(
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY item_index'
    )
      .bind(id)
      .all();
    items = r.results || [];
  }

  const html = renderReceipt(order, items);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// ---------- Helpers ----------

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function money(n) {
  return 'RM ' + Number(n || 0).toFixed(2);
}

function fmtDateLong(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const day = d.getUTCDate();
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} · ${hh}:${mm} UTC`;
  } catch {
    return esc(iso);
  }
}

function renderItemsBlock(order, items) {
  if (order.product_type === 'keychain' && items.length) {
    const rows = items
      .map(
        (it, i) => `
        <tr class="item">
          <td class="qty">1</td>
          <td>
            <div class="name">Keychain #${i + 1}</div>
            <div class="sub">
              Department: ${esc(it.department)}<br>
              Engraving: ${esc(it.engraving_value)}<br>
              Avatar: ${esc(it.avatar_choice)}${
          it.avatar_key ? ' (custom upload)' : ''
        }
            </div>
          </td>
          <td class="r">${money(order.unit_price)}</td>
          <td class="r">${money(order.unit_price)}</td>
        </tr>`
      )
      .join('');
    return rows;
  }

  // Non-keychain: single line item with the product name and qty
  let extras = '';
  if (order.product_type === 'bizcard') {
    try {
      const d = JSON.parse(order.details_json || '{}');
      if (d.company_address) {
        extras = `<div class="sub">Company address: ${esc(d.company_address)}</div>`;
      }
    } catch {}
  } else if (order.product_type === 'cablewinder') {
    extras = `<div class="sub">Logo file: ${esc(order.logo_key || '(uploaded)')}</div>`;
  }

  return `
    <tr class="item">
      <td class="qty">${order.quantity}</td>
      <td>
        <div class="name">${esc(order.product_name || order.product_type)}</div>
        ${extras}
      </td>
      <td class="r">${money(order.unit_price)}</td>
      <td class="r">${money(order.unit_price * order.quantity)}</td>
    </tr>
  `;
}

function renderReceipt(order, items) {
  const subtotal = (order.unit_price || 0) * (order.quantity || 0);
  const shipping = order.shipping_cost || 0;
  const total = order.total_amount || 0;

  const shippingLine =
    order.shipping_method === 'standard'
      ? `Standard Shipping (West Malaysia)`
      : `Self-collect at KOE, IIUM`;

  const mailing =
    order.shipping_method === 'standard' && order.mailing_address
      ? `<div class="addr">${esc(order.mailing_address)}</div>`
      : '';

  const notesBlock = order.notes
    ? `<div class="notes"><strong>Notes:</strong> ${esc(order.notes)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Receipt — ${esc(order.order_id)} | Durible3D</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
<style>${RECEIPT_CSS}</style>
</head>
<body>

  <div class="toolbar no-print">
    <a href="/admin" class="btn-link">&larr; Back to admin</a>
    <button type="button" class="btn-print" onclick="window.print()">&#128424; Print receipt</button>
  </div>

  <main class="receipt">
    <header class="r-head">
      <img src="/Durible_logo.png" alt="Durible3D" class="r-logo">
      <div class="r-brand">
        <div class="r-name">DURIBLE3D STUDIO</div>
        <div class="r-tag">Custom 3D-printed lifestyle pieces</div>
        <div class="r-tag">ordo.earth</div>
      </div>
    </header>

    <div class="r-title">
      <h1>RECEIPT</h1>
      <div class="r-meta">
        <div><span class="k">Order ID:</span> <strong>${esc(order.order_id)}</strong></div>
        <div><span class="k">Date:</span> ${fmtDateLong(order.created_at)}</div>
        <div><span class="k">Status:</span> <span class="badge badge-${esc(order.status)}">${esc(order.status)}</span></div>
      </div>
    </div>

    <section class="r-section">
      <h2>Bill to</h2>
      <div><strong>${esc(order.full_name)}</strong></div>
      <div>${esc(order.contact_number)}</div>
      ${order.email ? `<div>${esc(order.email)}</div>` : ''}
    </section>

    <section class="r-section">
      <h2>Delivery</h2>
      <div>${esc(shippingLine)}</div>
      ${mailing}
    </section>

    <section class="r-section">
      <h2>Items</h2>
      <table class="items">
        <thead>
          <tr>
            <th class="qty">Qty</th>
            <th>Description</th>
            <th class="r">Unit Price</th>
            <th class="r">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${renderItemsBlock(order, items)}
        </tbody>
      </table>
    </section>

    <section class="r-totals">
      <div class="t-line"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <div class="t-line"><span>Shipping</span><span>${money(shipping)}</span></div>
      <div class="t-line t-grand"><span>Total</span><span>${money(total)}</span></div>
    </section>

    ${notesBlock}

    <section class="r-payment">
      <div><span class="k">Payment slip:</span> ${esc(order.payment_slip_key || '—')}</div>
    </section>

    <footer class="r-foot">
      <div>Thank you for supporting Durible3D!</div>
      <div class="muted">Printed in Malaysia · Designed inside International Islamic University Malaysia</div>
    </footer>
  </main>

</body>
</html>`;
}

const RECEIPT_CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:'Roboto',sans-serif;font-size:13px;color:#222;background:#eee;padding:24px}
.no-print{}
.toolbar{max-width:800px;margin:0 auto 16px;display:flex;gap:12px;align-items:center}
.btn-link{font-size:13px;color:#555;text-decoration:none;padding:8px 14px;background:#fff;border:1px solid #ddd}
.btn-link:hover{background:#f6f6f6}
.btn-print{font-family:'Oswald',sans-serif;font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;background:#000;color:#fff;border:none;padding:10px 20px;cursor:pointer;margin-left:auto}
.btn-print:hover{background:#c6a96a}
.receipt{max-width:800px;margin:0 auto;background:#fff;padding:48px 56px;border:1px solid #ddd;box-shadow:0 4px 14px rgba(0,0,0,0.06)}
.r-head{display:flex;align-items:center;gap:20px;border-bottom:3px solid #000;padding-bottom:20px;margin-bottom:24px}
.r-logo{height:56px;width:auto}
.r-name{font-family:'Oswald',sans-serif;font-size:22px;font-weight:600;letter-spacing:3px;color:#000}
.r-tag{font-size:11px;color:#666}
.r-title{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:16px}
.r-title h1{font-family:'Oswald',sans-serif;font-size:34px;font-weight:500;letter-spacing:4px;margin:0}
.r-meta{font-size:12px;line-height:1.8;text-align:right}
.r-meta .k{color:#888;display:inline-block;min-width:75px}
.badge{display:inline-block;padding:2px 10px;border-radius:3px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
.badge-pending{background:#fff3cd;color:#856404}
.badge-confirmed{background:#cfe2ff;color:#084298}
.badge-shipped{background:#d1e7dd;color:#0f5132}
.badge-cancelled{background:#f8d7da;color:#842029}
.r-section{margin-bottom:20px}
.r-section h2{font-family:'Oswald',sans-serif;font-size:11px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0 0 6px;border-bottom:1px solid #eee;padding-bottom:4px}
.addr{margin-top:4px;color:#444}
table.items{width:100%;border-collapse:collapse;margin-top:4px}
table.items th{font-family:'Oswald',sans-serif;font-size:10px;font-weight:500;letter-spacing:1px;text-transform:uppercase;color:#888;padding:8px 6px;border-bottom:1px solid #ddd;text-align:left}
table.items td{padding:10px 6px;border-bottom:1px solid #f0f0f0;vertical-align:top}
table.items td.qty{width:50px;text-align:center;font-weight:500}
table.items td.r,table.items th.r{text-align:right}
table.items th.qty{text-align:center}
.name{font-weight:500;color:#000}
.sub{font-size:11px;color:#666;margin-top:4px;line-height:1.6}
.r-totals{margin-top:8px;padding-top:8px;display:flex;flex-direction:column;align-items:flex-end}
.t-line{display:flex;justify-content:space-between;width:280px;padding:6px 0;font-size:13px}
.t-line span:first-child{color:#666}
.t-grand{font-family:'Oswald',sans-serif;font-size:18px;font-weight:600;color:#000;border-top:2px solid #000;margin-top:6px;padding-top:10px}
.notes{margin-top:16px;font-size:12px;color:#444;background:#fafafa;padding:10px 14px;border-left:3px solid #c6a96a}
.r-payment{margin-top:16px;font-size:11px;color:#888;border-top:1px dashed #ddd;padding-top:12px}
.r-payment .k{color:#888}
.r-foot{margin-top:32px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#444}
.r-foot .muted{font-size:10px;color:#999;margin-top:4px}

@media print{
  @page{size:A4;margin:14mm}
  body{background:#fff;padding:0}
  .no-print{display:none !important}
  .receipt{max-width:none;border:none;box-shadow:none;padding:0}
  .badge{border:1px solid #999;background:#fff !important;color:#000 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .notes{background:#fff !important;border-left-color:#000 !important}
}
`;
