// GET /admin/manage — Ordo Admin business tool (orders board, finance/PnL,
// inventory, pricing calculator, clients, settings). A client-side React
// app; this just serves the HTML shell. The bundled JS is served by
// /admin/manage-bundle (Pages Functions route, no .js suffix) and its
// data by /admin/manage-data.
// Distinct from /admin (customer order intake dashboard) and /admin/pilots.

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ordo Admin — Manage</title>
</head>
<body style="margin:0">
  <div id="root"></div>
  <script src="/admin/manage-bundle"></script>
</body>
</html>`;

export async function onRequestGet() {
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
