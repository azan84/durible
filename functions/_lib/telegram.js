// Shared Telegram notification helper.
// Sends messages to a chat via the Bot API, using secrets:
//   TELEGRAM_BOT_TOKEN  — from @BotFather
//   TELEGRAM_CHAT_ID    — the target chat (your personal DM with the bot)
//
// Failure to send is logged and swallowed — never throws. A down Telegram
// must not break an order submission.

export async function sendTelegramText(env, text) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    return { ok: false, reason: 'telegram_not_configured' };
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      return { ok: false, status: resp.status, body: body.slice(0, 300) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'fetch_failed' };
  }
}

// Escape HTML entities for Telegram HTML parse_mode
export function tgEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Build the human-readable order notification.
// order: row from `orders`; items: array from `order_items` (keychain only).
export function buildOrderMessage(order, items, opts) {
  const baseUrl =
    (opts && opts.baseUrl) || 'https://durible.biomechemical.com';
  const L = [];
  L.push(`🛒 <b>New order — ${tgEsc(order.order_id)}</b>`);
  L.push('');
  L.push(
    `📦 <b>${tgEsc(order.product_name)}</b> · Qty <b>${order.quantity}</b>`
  );
  L.push(
    `💰 Total: <b>RM ${Number(order.total_amount).toFixed(2)}</b>  ` +
      `<i>(${order.quantity} × RM ${Number(order.unit_price).toFixed(2)} + RM ${Number(
        order.shipping_cost
      ).toFixed(2)} ship)</i>`
  );
  L.push('');
  L.push('<b>Buyer</b>');
  L.push(`  ${tgEsc(order.full_name)}`);
  L.push(`  ${tgEsc(order.contact_number)}`);
  if (order.email) L.push(`  ${tgEsc(order.email)}`);
  L.push('');
  L.push('<b>Delivery</b>');
  if (order.shipping_method === 'standard') {
    L.push('  Standard shipping (+RM5)');
    if (order.mailing_address) L.push(`  ${tgEsc(order.mailing_address)}`);
  } else {
    L.push('  Self-collect at KOE, IIUM');
  }

  // Product-specific detail section
  if (order.product_type === 'keychain' && items && items.length) {
    L.push('');
    L.push('<b>Keychains</b>');
    items.forEach((it, i) => {
      const avatarNote = it.avatar_key ? ' · custom avatar uploaded' : '';
      L.push(
        `  ${i + 1}. ${tgEsc(it.department)} · ${tgEsc(it.engraving_value)} · ` +
          `${tgEsc(it.avatar_choice)}${avatarNote}`
      );
    });
  } else if (order.product_type === 'bizcard') {
    let details = {};
    try {
      details = JSON.parse(order.details_json || '{}');
    } catch {}
    if (details.company_address) {
      L.push('');
      L.push('<b>Company address</b>');
      L.push(`  ${tgEsc(details.company_address)}`);
    }
  } else if (order.product_type === 'cablewinder' && order.logo_key) {
    L.push('');
    L.push(`<b>Logo uploaded</b>  <code>${tgEsc(order.logo_key)}</code>`);
  }

  if (order.notes) {
    L.push('');
    L.push('<b>Notes</b>');
    L.push(`  ${tgEsc(order.notes)}`);
  }

  L.push('');
  L.push('<b>Payment slip</b>');
  L.push(`  <code>${tgEsc(order.payment_slip_key)}</code>`);

  L.push('');
  L.push(
    `🧾 <a href="${baseUrl}/admin/receipt?id=${encodeURIComponent(
      order.order_id
    )}">View receipt</a> · <a href="${baseUrl}/admin">Admin dashboard</a>`
  );

  return L.join('\n');
}
