// GET /admin — orders dashboard.
// Lists all orders from D1, joined with order_items (for keychains).
// Query params:
//   ?status=pending|confirmed|shipped|cancelled   — filter by status
//   ?product=keychain|bizcard|cablewinder|bagtag  — filter by product
//   ?updated=DUR-XXX                              — flash message after status update

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const filterStatus = (url.searchParams.get('status') || '').trim();
  const filterProduct = (url.searchParams.get('product') || '').trim();
  const updated = url.searchParams.get('updated') || '';

  const validStatus = ['pending', 'confirmed', 'shipped', 'cancelled'];
  const validProduct = ['keychain', 'bizcard', 'cablewinder', 'bagtag'];

  let query = 'SELECT * FROM orders';
  const wheres = [];
  const binds = [];
  if (validStatus.includes(filterStatus)) {
    wheres.push('status = ?');
    binds.push(filterStatus);
  }
  if (validProduct.includes(filterProduct)) {
    wheres.push('product_type = ?');
    binds.push(filterProduct);
  }
  if (wheres.length) query += ' WHERE ' + wheres.join(' AND ');
  query += ' ORDER BY id DESC LIMIT 500';

  const { results: orders } = await env.DB.prepare(query).bind(...binds).all();

  let itemsByOrder = {};
  if (orders.length > 0) {
    const { results: items } = await env.DB.prepare(
      'SELECT * FROM order_items ORDER BY order_id, item_index'
    ).all();
    for (const it of items) {
      (itemsByOrder[it.order_id] ||= []).push(it);
    }
  }

  // Stats always computed over the filtered set
  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const counts = { pending: 0, confirmed: 0, shipped: 0, cancelled: 0 };
  for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;

  const html = renderHtml({
    orders,
    itemsByOrder,
    filterStatus,
    filterProduct,
    updated,
    totalRevenue,
    counts,
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// ---------- Rendering ----------

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

function fmtDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return (
      d.getUTCFullYear() +
      '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getUTCDate()).padStart(2, '0') +
      ' ' +
      String(d.getUTCHours()).padStart(2, '0') +
      ':' +
      String(d.getUTCMinutes()).padStart(2, '0')
    );
  } catch {
    return esc(iso);
  }
}

function statusBadge(status) {
  return `<span class="badge badge-${esc(status)}">${esc(status)}</span>`;
}

function slipLink(key, label) {
  if (!key) return '';
  return `<a href="/admin/slip?key=${encodeURIComponent(key)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function renderDetails(order, items) {
  const parts = [];

  if (order.product_type === 'keychain' && items && items.length) {
    parts.push('<strong>Keychains:</strong>');
    parts.push('<ol class="items-list">');
    for (const it of items) {
      parts.push(
        `<li>
          <span class="k">Dept:</span> ${esc(it.department)}
          &nbsp; <span class="k">Engraving:</span> ${esc(it.engraving_value)}
          &nbsp; <span class="k">Avatar:</span> ${esc(it.avatar_choice)}
          ${it.avatar_key ? ' &nbsp; ' + slipLink(it.avatar_key, 'view avatar') : ''}
        </li>`
      );
    }
    parts.push('</ol>');
  }

  if (order.product_type === 'bizcard') {
    let details = {};
    try {
      details = JSON.parse(order.details_json || '{}');
    } catch {}
    if (details.company_address) {
      parts.push(`<div><span class="k">Company address:</span> ${esc(details.company_address)}</div>`);
    }
  }

  if (order.product_type === 'cablewinder' && order.logo_key) {
    parts.push(`<div><span class="k">Logo:</span> ${slipLink(order.logo_key, 'view logo')}</div>`);
  }

  if (order.shipping_method === 'standard' && order.mailing_address) {
    parts.push(`<div><span class="k">Mailing address:</span> ${esc(order.mailing_address)}</div>`);
  }

  if (order.notes) {
    parts.push(`<div><span class="k">Notes:</span> ${esc(order.notes)}</div>`);
  }

  if (order.email) {
    parts.push(`<div><span class="k">Email:</span> ${esc(order.email)}</div>`);
  }

  parts.push(
    `<div><span class="k">Payment slip:</span> ${slipLink(order.payment_slip_key, 'view slip')}</div>`
  );

  return parts.join('');
}

function renderRow(order, items) {
  const statusOptions = ['pending', 'confirmed', 'shipped', 'cancelled']
    .map(
      (s) =>
        `<option value="${s}"${order.status === s ? ' selected' : ''}>${s}</option>`
    )
    .join('');

  return `
    <tr class="row-${esc(order.status)}">
      <td>
        <div class="oid">${esc(order.order_id)}</div>
        <div class="meta">${fmtDate(order.created_at)}</div>
      </td>
      <td>${esc(order.product_name || order.product_type)}</td>
      <td>${esc(order.full_name)}</td>
      <td class="nowrap">${esc(order.contact_number)}</td>
      <td class="r">${order.quantity}</td>
      <td class="nowrap">${
        order.shipping_method === 'standard' ? 'Ship +RM5' : 'Collect'
      }</td>
      <td class="r strong">${money(order.total_amount)}</td>
      <td>
        <form method="POST" action="/admin/status" class="status-form">
          <input type="hidden" name="order_id" value="${esc(order.order_id)}">
          <select name="status" onchange="this.form.submit()">
            ${statusOptions}
          </select>
        </form>
      </td>
      <td>
        <details>
          <summary>view</summary>
          <div class="details-body">${renderDetails(order, items)}</div>
        </details>
      </td>
    </tr>
  `;
}

function filterLink(label, key, value, currentStatus, currentProduct) {
  // Preserve the other filter while toggling this one
  const params = new URLSearchParams();
  if (key === 'status') {
    if (value) params.set('status', value);
    if (currentProduct) params.set('product', currentProduct);
  } else {
    if (currentStatus) params.set('status', currentStatus);
    if (value) params.set('product', value);
  }
  const qs = params.toString();
  const href = qs ? `/admin?${qs}` : '/admin';
  const active =
    (key === 'status' && currentStatus === value) ||
    (key === 'product' && currentProduct === value)
      ? ' active'
      : !value && !currentStatus && key === 'status' && !currentProduct
      ? ' active'
      : '';
  return `<a href="${href}" class="chip${active}">${esc(label)}</a>`;
}

function renderHtml({
  orders,
  itemsByOrder,
  filterStatus,
  filterProduct,
  updated,
  totalRevenue,
  counts,
}) {
  const rows = orders.length
    ? orders.map((o) => renderRow(o, itemsByOrder[o.order_id])).join('')
    : `<tr><td colspan="9" class="empty">No orders match the current filter.</td></tr>`;

  const flash = updated
    ? `<div class="flash">Updated <code>${esc(updated)}</code>.</div>`
    : '';

  const statusChips = [
    { label: 'All statuses', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Cancelled', value: 'cancelled' },
  ]
    .map((c) => filterLink(c.label, 'status', c.value, filterStatus, filterProduct))
    .join('');

  const productChips = [
    { label: 'All products', value: '' },
    { label: 'Keychain', value: 'keychain' },
    { label: 'Biz Card', value: 'bizcard' },
    { label: 'Cable Winder', value: 'cablewinder' },
    { label: 'Bag Tag', value: 'bagtag' },
  ]
    .map((c) => filterLink(c.label, 'product', c.value, filterStatus, filterProduct))
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Durible Admin — Orders</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
<style>${ADMIN_CSS}</style>
</head>
<body>
  <header class="topbar">
    <div class="wrap">
      <h1>DURIBLE3D ADMIN</h1>
      <div class="stats">
        <div><strong>${orders.length}</strong> orders shown</div>
        <div>Revenue: <strong>${money(totalRevenue)}</strong></div>
        <div class="counts">
          <span class="badge badge-pending">${counts.pending || 0} pending</span>
          <span class="badge badge-confirmed">${counts.confirmed || 0} confirmed</span>
          <span class="badge badge-shipped">${counts.shipped || 0} shipped</span>
          <span class="badge badge-cancelled">${counts.cancelled || 0} cancelled</span>
        </div>
      </div>
    </div>
  </header>

  <main class="wrap">
    ${flash}

    <div class="filters">
      <div class="chips">${statusChips}</div>
      <div class="chips">${productChips}</div>
      <div class="actions">
        <a href="/admin/export.csv${buildExportQuery(filterStatus, filterProduct)}" class="btn btn-primary">
          &darr; Export CSV
        </a>
        <button type="button" class="btn btn-secondary" onclick="openAllDetailsThenPrint()">
          &#128424; Print / Save as PDF
        </button>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Product</th>
            <th>Buyer</th>
            <th>Contact</th>
            <th class="r">Qty</th>
            <th>Ship</th>
            <th class="r">Total</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <p class="hint">
      Showing up to 500 most recent orders. Use the status and product filters above to narrow.
      Changing the <strong>Status</strong> dropdown on any row auto-saves and reloads this page.
      <strong>Export CSV</strong> downloads a file that opens in Excel / Google Sheets /
      Numbers — save as .xlsx from there if you prefer.
      <strong>Print / Save as PDF</strong> opens your browser's print dialog — pick "Save as PDF"
      as the destination.
    </p>
  </main>

  <script>
    // Expand every <details> row before printing, then open the print dialog.
    // After printing (or cancelling), close them again.
    function openAllDetailsThenPrint() {
      var els = document.querySelectorAll('details');
      var previouslyOpen = [];
      els.forEach(function(d, i) {
        previouslyOpen[i] = d.open;
        d.open = true;
      });
      setTimeout(function() { window.print(); }, 100);
      // Restore after print dialog closes
      window.addEventListener('afterprint', function restore() {
        els.forEach(function(d, i) { d.open = previouslyOpen[i]; });
        window.removeEventListener('afterprint', restore);
      });
    }
  </script>
</body>
</html>`;
}

function buildExportQuery(filterStatus, filterProduct) {
  const params = new URLSearchParams();
  if (filterStatus) params.set('status', filterStatus);
  if (filterProduct) params.set('product', filterProduct);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

const ADMIN_CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:'Roboto',sans-serif;font-size:14px;color:#222;background:#f4f4f4}
a{color:#0a58ca;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1400px;margin:0 auto;padding:0 24px}
.topbar{background:#000;color:#fff;padding:24px 0;margin-bottom:24px}
.topbar h1{font-family:'Oswald',sans-serif;font-size:28px;font-weight:500;letter-spacing:3px;margin:0 0 10px}
.stats{display:flex;gap:32px;flex-wrap:wrap;align-items:center;font-size:13px}
.stats strong{color:#c6a96a}
.counts{display:flex;gap:8px;margin-left:auto}
.badge{display:inline-block;padding:3px 10px;border-radius:3px;font-size:11px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase}
.badge-pending{background:#fff3cd;color:#856404}
.badge-confirmed{background:#cfe2ff;color:#084298}
.badge-shipped{background:#d1e7dd;color:#0f5132}
.badge-cancelled{background:#f8d7da;color:#842029}
.flash{background:#d1e7dd;color:#0f5132;padding:10px 16px;border-left:4px solid #0f5132;margin-bottom:16px;font-size:13px}
.flash code{background:rgba(0,0,0,0.1);padding:1px 6px;border-radius:2px}
.filters{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.actions{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;border:none;cursor:pointer;text-decoration:none;transition:background 0.15s}
.btn-primary{background:#000;color:#fff}
.btn-primary:hover{background:#c6a96a;text-decoration:none}
.btn-secondary{background:#fff;color:#000;border:1px solid #000}
.btn-secondary:hover{background:#000;color:#fff}
.chip{display:inline-block;padding:6px 12px;background:#fff;border:1px solid #ddd;border-radius:20px;font-size:12px;color:#444;text-decoration:none}
.chip:hover{border-color:#888;text-decoration:none}
.chip.active{background:#000;color:#fff;border-color:#000}
.table-wrap{background:#fff;border:1px solid #e0e0e0;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:10px 12px;text-align:left;vertical-align:top}
thead th{background:#f8f8f8;border-bottom:2px solid #000;font-family:'Oswald',sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:500}
tbody tr{border-bottom:1px solid #eee}
tbody tr:hover{background:#fafafa}
.r{text-align:right}
.strong{font-weight:600}
.nowrap{white-space:nowrap}
.oid{font-family:monospace;font-size:12px;color:#000;font-weight:500}
.meta{font-size:11px;color:#888;margin-top:2px}
.status-form select{padding:4px 6px;border:1px solid #ccc;font-size:12px;background:#fff;cursor:pointer}
details summary{cursor:pointer;font-size:12px;color:#0a58ca}
details[open] summary{color:#666;margin-bottom:6px}
.details-body{background:#fafafa;padding:10px 12px;border:1px solid #eee;font-size:12px;line-height:1.7;max-width:420px;word-wrap:break-word}
.details-body .k{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
.items-list{margin:4px 0;padding-left:20px}
.items-list li{margin-bottom:4px}
.row-cancelled{opacity:0.55}
.row-shipped{background:#f6fbf6}
.empty{text-align:center;padding:40px;color:#888}
.hint{font-size:12px;color:#888;margin-top:16px}
@media (max-width:768px){
  .stats{flex-direction:column;align-items:flex-start;gap:10px}
  .counts{margin-left:0}
  .table-wrap{font-size:12px}
}
@media print{
  @page{size:A4 landscape;margin:12mm}
  body{background:#fff;font-size:10px}
  .topbar{background:#fff;color:#000;padding:0 0 12px;margin-bottom:12px;border-bottom:2px solid #000}
  .topbar h1{color:#000;font-size:18px;letter-spacing:2px}
  .stats strong{color:#000}
  .filters,.hint,.status-form,.actions{display:none !important}
  .table-wrap{border:none;overflow:visible}
  table{font-size:9px}
  thead th{background:#f0f0f0 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  tbody tr{page-break-inside:avoid;border-bottom:1px solid #999}
  .badge{border:1px solid #666;background:#fff !important;color:#000 !important;-webkit-print-color-adjust:exact}
  .row-cancelled{opacity:1;text-decoration:line-through}
  details{open:true}
  details summary{display:none}
  .details-body{background:#fff;border:none;padding:4px 0;max-width:none}
  a{color:#000;text-decoration:none}
}
`;
