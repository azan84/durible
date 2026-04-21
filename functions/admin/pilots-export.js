// GET /admin/pilots-export?status=...
// Downloads all pilot leads matching the current status filter as a CSV.
// Mirrors /admin/export for orders: UTF-8 BOM so Excel opens correctly.

const VALID_STATUS = ['new', 'contacted', 'piloting', 'closed'];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const filterStatus = (url.searchParams.get('status') || '').trim();

  let query = 'SELECT * FROM pilot_leads';
  const binds = [];
  if (VALID_STATUS.includes(filterStatus)) {
    query += ' WHERE status = ?';
    binds.push(filterStatus);
  }
  query += ' ORDER BY id DESC';

  const { results: leads } = await env.DB.prepare(query).bind(...binds).all();

  const headers = [
    'Pilot ID',
    'Created At (UTC)',
    'Company',
    'Contact',
    'Email',
    'Phone',
    'Use Case',
    'Notes',
    'Status',
  ];

  const rows = [headers];
  for (const l of leads) {
    rows.push([
      l.pilot_id,
      l.created_at,
      l.company_name,
      l.contact_name,
      l.email,
      l.phone,
      l.use_case || '',
      l.notes || '',
      l.status,
    ]);
  }

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const body = '\uFEFF' + csv;

  const now = new Date();
  const stamp =
    now.getUTCFullYear() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0') +
    '-' +
    String(now.getUTCHours()).padStart(2, '0') +
    String(now.getUTCMinutes()).padStart(2, '0');

  let filenameBase = 'ordo-pilots';
  if (filterStatus) filenameBase += '-' + filterStatus;
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
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
