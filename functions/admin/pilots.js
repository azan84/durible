// GET /admin/pilots — Durible pilot-programme leads dashboard.
// Lists pilot_leads rows with expandable notes, status dropdown, CSV export.
// Distinct from /admin (which handles paid orders).

const VALID_STATUS = ['new', 'contacted', 'piloting', 'closed'];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const filterStatus = (url.searchParams.get('status') || '').trim();
  const updated = url.searchParams.get('updated') || '';

  let query = 'SELECT * FROM pilot_leads';
  const binds = [];
  if (VALID_STATUS.includes(filterStatus)) {
    query += ' WHERE status = ?';
    binds.push(filterStatus);
  }
  query += ' ORDER BY id DESC LIMIT 500';

  const { results: leads } = await env.DB.prepare(query).bind(...binds).all();

  const counts = { new: 0, contacted: 0, piloting: 0, closed: 0 };
  for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1;

  return new Response(
    renderHtml({ leads, filterStatus, updated, counts }),
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
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

function fmtDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return (
      d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0') + ' ' +
      String(d.getUTCHours()).padStart(2, '0') + ':' +
      String(d.getUTCMinutes()).padStart(2, '0')
    );
  } catch {
    return esc(iso);
  }
}

function renderRow(lead) {
  const statusOptions = VALID_STATUS
    .map((s) => `<option value="${s}"${lead.status === s ? ' selected' : ''}>${s}</option>`)
    .join('');

  const notesBlock = lead.notes
    ? `<div><span class="k">Notes:</span> ${esc(lead.notes)}</div>`
    : '<div class="muted">No extra notes</div>';

  return `
    <tr class="row-${esc(lead.status)}">
      <td>
        <div class="oid">${esc(lead.pilot_id)}</div>
        <div class="meta">${fmtDate(lead.created_at)}</div>
      </td>
      <td>${esc(lead.company_name)}</td>
      <td>${esc(lead.contact_name)}</td>
      <td class="nowrap"><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></td>
      <td class="nowrap">${esc(lead.phone)}</td>
      <td>${esc(lead.use_case || '')}</td>
      <td>
        <form method="POST" action="/admin/pilot-status" class="status-form">
          <input type="hidden" name="pilot_id" value="${esc(lead.pilot_id)}">
          <select name="status" onchange="this.form.submit()">
            ${statusOptions}
          </select>
        </form>
      </td>
      <td>
        <details>
          <summary>view</summary>
          <div class="details-body">${notesBlock}</div>
        </details>
      </td>
    </tr>
  `;
}

function filterLink(label, value, currentStatus) {
  const params = new URLSearchParams();
  if (value) params.set('status', value);
  const qs = params.toString();
  const href = qs ? `/admin/pilots?${qs}` : '/admin/pilots';
  const active =
    (currentStatus === value) ||
    (!value && !currentStatus)
      ? ' active'
      : '';
  return `<a href="${href}" class="chip${active}">${esc(label)}</a>`;
}

function renderHtml({ leads, filterStatus, updated, counts }) {
  const rows = leads.length
    ? leads.map(renderRow).join('')
    : `<tr><td colspan="8" class="empty">No pilot leads yet.</td></tr>`;

  const flash = updated
    ? `<div class="flash">Updated <code>${esc(updated)}</code>.</div>`
    : '';

  const chips = [
    { label: 'All', value: '' },
    { label: 'New', value: 'new' },
    { label: 'Contacted', value: 'contacted' },
    { label: 'Piloting', value: 'piloting' },
    { label: 'Closed', value: 'closed' },
  ]
    .map((c) => filterLink(c.label, c.value, filterStatus))
    .join('');

  const exportQs = filterStatus ? `?status=${encodeURIComponent(filterStatus)}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ordo Admin — Pilot leads</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
<style>${ADMIN_CSS}</style>
</head>
<body>
  <header class="topbar">
    <div class="wrap">
      <h1>ORDO ADMIN</h1>
      <nav class="topnav">
        <a href="/admin">Orders</a>
        <a href="/admin/pilots" class="active">Pilot leads · Durible</a>
      </nav>
      <div class="stats">
        <div><strong>${leads.length}</strong> leads shown</div>
        <div class="counts">
          <span class="badge badge-new">${counts.new || 0} new</span>
          <span class="badge badge-contacted">${counts.contacted || 0} contacted</span>
          <span class="badge badge-piloting">${counts.piloting || 0} piloting</span>
          <span class="badge badge-closed">${counts.closed || 0} closed</span>
        </div>
      </div>
    </div>
  </header>

  <main class="wrap">
    ${flash}

    <div class="filters">
      <div class="chips">${chips}</div>
      <div class="actions">
        <a href="/admin/pilots-export${exportQs}" class="btn btn-primary">&darr; Export CSV</a>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Pilot ID</th>
            <th>Company</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Use case</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <p class="hint">
      Leads captured via the Durible pilot form on the homepage.
      Changing the <strong>Status</strong> dropdown on any row auto-saves and reloads.
    </p>
  </main>
</body>
</html>`;
}

const ADMIN_CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:'Roboto',sans-serif;font-size:14px;color:#222;background:#f4f4f4}
a{color:#0a58ca;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1400px;margin:0 auto;padding:0 24px}
.topbar{background:#000;color:#fff;padding:24px 0 18px;margin-bottom:24px}
.topbar h1{font-family:'Oswald',sans-serif;font-size:28px;font-weight:500;letter-spacing:3px;margin:0 0 10px}
.topnav{display:flex;gap:16px;margin-bottom:14px;font-size:12px;letter-spacing:1px;text-transform:uppercase}
.topnav a{color:#aaa;padding:4px 8px;border-bottom:2px solid transparent}
.topnav a:hover{color:#fff;text-decoration:none}
.topnav a.active{color:#c6a96a;border-bottom-color:#c6a96a}
.stats{display:flex;gap:32px;flex-wrap:wrap;align-items:center;font-size:13px}
.stats strong{color:#c6a96a}
.counts{display:flex;gap:8px;margin-left:auto}
.badge{display:inline-block;padding:3px 10px;border-radius:3px;font-size:11px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase}
.badge-new{background:#fff3cd;color:#856404}
.badge-contacted{background:#cfe2ff;color:#084298}
.badge-piloting{background:#d1e7dd;color:#0f5132}
.badge-closed{background:#e0e0e0;color:#444}
.flash{background:#d1e7dd;color:#0f5132;padding:10px 16px;border-left:4px solid #0f5132;margin-bottom:16px;font-size:13px}
.flash code{background:rgba(0,0,0,0.1);padding:1px 6px;border-radius:2px}
.filters{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.actions{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;border:none;cursor:pointer;text-decoration:none;transition:background 0.15s}
.btn-primary{background:#000;color:#fff}
.btn-primary:hover{background:#c6a96a;text-decoration:none}
.chip{display:inline-block;padding:6px 12px;background:#fff;border:1px solid #ddd;border-radius:20px;font-size:12px;color:#444;text-decoration:none}
.chip:hover{border-color:#888;text-decoration:none}
.chip.active{background:#000;color:#fff;border-color:#000}
.table-wrap{background:#fff;border:1px solid #e0e0e0;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:10px 12px;text-align:left;vertical-align:top}
thead th{background:#f8f8f8;border-bottom:2px solid #000;font-family:'Oswald',sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:500}
tbody tr{border-bottom:1px solid #eee}
tbody tr:hover{background:#fafafa}
.nowrap{white-space:nowrap}
.oid{font-family:monospace;font-size:12px;color:#000;font-weight:500}
.meta{font-size:11px;color:#888;margin-top:2px}
.status-form select{padding:4px 6px;border:1px solid #ccc;font-size:12px;background:#fff;cursor:pointer}
details summary{cursor:pointer;font-size:12px;color:#0a58ca}
details[open] summary{color:#666;margin-bottom:6px}
.details-body{background:#fafafa;padding:10px 12px;border:1px solid #eee;font-size:12px;line-height:1.7;max-width:420px;word-wrap:break-word}
.details-body .k{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
.details-body .muted{color:#aaa;font-style:italic}
.row-closed{opacity:0.6}
.empty{text-align:center;padding:40px;color:#888}
.hint{font-size:12px;color:#888;margin-top:16px}
@media (max-width:768px){
  .stats{flex-direction:column;align-items:flex-start;gap:10px}
  .counts{margin-left:0}
  .table-wrap{font-size:12px}
}
`;
