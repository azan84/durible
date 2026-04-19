// Shared WhatsApp notification helper via CallMeBot.
//
// CallMeBot is a free service that forwards text to your WhatsApp number
// using a one-time API key you activate in-app. Intended for self-
// notifications (you DM yourself from your scripts) — not for messaging
// customers. Works with both personal and WhatsApp Business numbers.
//
// Secrets required:
//   WHATSAPP_PHONE          — target phone, international, no '+' / spaces / dashes
//                             (e.g. 60107924208 for +60 10-792 4208)
//   CALLMEBOT_API_KEY       — the numeric key CallMeBot DMs you after activation
//
// Failure to send is logged and swallowed — never throws. A down service
// must not break an order submission.

export async function sendWhatsApp(env, text) {
  const phone = env.WHATSAPP_PHONE;
  const apikey = env.CALLMEBOT_API_KEY;
  if (!phone || !apikey) {
    return { ok: false, reason: 'whatsapp_not_configured' };
  }

  // CallMeBot endpoint: HTTPS GET with URL-encoded text
  const url =
    'https://api.callmebot.com/whatsapp.php?' +
    'phone=' + encodeURIComponent(phone) +
    '&apikey=' + encodeURIComponent(apikey) +
    '&text=' + encodeURIComponent(text);

  try {
    const resp = await fetch(url, { method: 'GET' });
    const body = await resp.text().catch(() => '');
    // CallMeBot returns 200 with the literal word "Message queued." on success.
    // Errors also return 200 but with an HTML / plain-text error body.
    const lower = body.toLowerCase();
    const looksOk =
      resp.ok &&
      (lower.includes('message queued') ||
        lower.includes('message sent') ||
        lower.includes('message to') ||
        lower.includes('processed'));
    if (!looksOk) {
      return { ok: false, status: resp.status, body: body.slice(0, 400) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'fetch_failed' };
  }
}

// CallMeBot forwards plain text only — no markdown / HTML. Keep it simple.
// Build the human-readable order notification.
// order: row from `orders`; items: array from `order_items` (keychain only).
export function buildOrderMessage(order, items, opts) {
  const baseUrl =
    (opts && opts.baseUrl) || 'https://ordo.earth';
  const L = [];
  L.push(`🛒 New order: ${order.order_id}`);
  L.push('');
  L.push(`📦 ${order.product_name} · Qty ${order.quantity}`);
  L.push(
    `💰 Total: RM ${Number(order.total_amount).toFixed(2)}  ` +
      `(${order.quantity} × RM ${Number(order.unit_price).toFixed(2)} + ` +
      `RM ${Number(order.shipping_cost).toFixed(2)} ship)`
  );
  L.push('');
  L.push('👤 Buyer');
  L.push(`   ${order.full_name}`);
  L.push(`   ${order.contact_number}`);
  if (order.email) L.push(`   ${order.email}`);
  L.push('');
  L.push('🚚 Delivery');
  if (order.shipping_method === 'standard') {
    L.push('   Standard shipping (+RM5)');
    if (order.mailing_address) L.push(`   ${order.mailing_address}`);
  } else {
    L.push('   Self-collect at KOE, IIUM');
  }

  // Product-specific details
  if (order.product_type === 'keychain' && items && items.length) {
    L.push('');
    L.push('🔑 Keychains');
    items.forEach((it, i) => {
      const avatarNote = it.avatar_key ? ' · custom avatar' : '';
      L.push(
        `   ${i + 1}. ${it.department} · ${it.engraving_value} · ` +
          `${it.avatar_choice}${avatarNote}`
      );
    });
  } else if (order.product_type === 'bizcard') {
    let details = {};
    try {
      details = JSON.parse(order.details_json || '{}');
    } catch {}
    if (details.company_address) {
      L.push('');
      L.push('🏢 Company address');
      L.push(`   ${details.company_address}`);
    }
  } else if (order.product_type === 'cablewinder' && order.logo_key) {
    L.push('');
    L.push(`🎨 Logo uploaded: ${order.logo_key}`);
  }

  if (order.notes) {
    L.push('');
    L.push('📝 Notes');
    L.push(`   ${order.notes}`);
  }

  L.push('');
  L.push('💳 Payment slip');
  L.push(`   ${order.payment_slip_key}`);

  L.push('');
  L.push(
    `🧾 Receipt: ${baseUrl}/admin/receipt?id=${encodeURIComponent(
      order.order_id
    )}`
  );
  L.push(`📋 Admin: ${baseUrl}/admin`);

  return L.join('\n');
}
