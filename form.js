// Durible3D order form handler
(function () {
  const form = document.getElementById('orderForm');
  if (!form) return;

  const qtyEl = document.getElementById('quantity');
  const itemsContainer = document.getElementById('items-container');
  const shippingEls = form.querySelectorAll('input[name="shipping_method"]');
  const addressRow = document.getElementById('address_row');
  const addressEl = document.getElementById('mailing_address');
  const unitEl = document.getElementById('unitTotal');
  const shippingEl = document.getElementById('shippingTotal');
  const grandEl = document.getElementById('grandTotal');
  const submitBtn = document.getElementById('submitBtn');
  const msgEl = document.getElementById('formMessage');

  const UNIT = 20;
  const SHIPPING = 5;
  const DEPARTMENTS = ['ECE', 'MEC', 'MCT', 'BTE', 'MME', 'CIVE', 'Do not include'];

  function fmt(n) {
    return 'RM ' + n.toFixed(2);
  }

  // ---- Per-item card generation ----
  function buildItemCard(index) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.itemIndex = String(index);

    const displayNum = index + 1;
    card.innerHTML = `
      <div class="item-card-header">KEYCHAIN #${displayNum}</div>

      <div class="form-row">
        <label>Department <span class="req">*</span></label>
        <select name="item_${index}_department" required>
          <option value="">-- Select department --</option>
          ${DEPARTMENTS.map((d) => `<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <label>Engraving Type <span class="req">*</span></label>
        <div class="radio-group">
          <label class="rdo"><input type="radio" name="item_${index}_engraving_type" value="batch" required checked> Batch number (e.g. KOE 012)</label>
          <label class="rdo"><input type="radio" name="item_${index}_engraving_type" value="matric"> Matric number (e.g. 1912345)</label>
        </div>
      </div>

      <div class="form-row">
        <label>Value to Engrave <span class="req">*</span></label>
        <input type="text" name="item_${index}_engraving_value" required placeholder="KOE 012" data-engraving-input>
      </div>

      <div class="form-row">
        <label>Personalise Avatar <span class="req">*</span></label>
        <div class="radio-group">
          <label class="rdo"><input type="radio" name="item_${index}_avatar_choice" value="male" required checked> Male avatar</label>
          <label class="rdo"><input type="radio" name="item_${index}_avatar_choice" value="female"> Female avatar</label>
          <label class="rdo"><input type="radio" name="item_${index}_avatar_choice" value="custom"> Upload my own</label>
        </div>
        <input type="file" name="item_${index}_avatar_file" accept="image/*" class="mt-8 file-input" data-avatar-file>
        <small>Upload only if you chose "Upload my own". Max 10 MB.</small>
      </div>
    `;

    // Wire up the engraving type <-> placeholder link
    const typeRadios = card.querySelectorAll(`input[name="item_${index}_engraving_type"]`);
    const engInput = card.querySelector('[data-engraving-input]');
    typeRadios.forEach((r) => {
      r.addEventListener('change', () => {
        if (r.checked) {
          engInput.placeholder = r.value === 'batch' ? 'KOE 012' : '1912345';
        }
      });
    });

    return card;
  }

  function syncItems() {
    const qty = parseInt(qtyEl.value, 10) || 1;
    const existing = itemsContainer.children.length;

    if (qty > existing) {
      for (let i = existing; i < qty; i++) {
        itemsContainer.appendChild(buildItemCard(i));
      }
    } else if (qty < existing) {
      for (let i = existing - 1; i >= qty; i--) {
        itemsContainer.removeChild(itemsContainer.children[i]);
      }
    }
  }

  function recalc() {
    const qty = parseInt(qtyEl.value, 10) || 1;
    const shipping = form.querySelector('input[name="shipping_method"]:checked');
    const ship = shipping && shipping.value === 'standard' ? SHIPPING : 0;
    const unitTotal = qty * UNIT;
    const grand = unitTotal + ship;

    unitEl.textContent = fmt(unitTotal);
    shippingEl.textContent = fmt(ship);
    grandEl.textContent = fmt(grand);

    if (shipping && shipping.value === 'standard') {
      addressRow.style.display = 'block';
      addressEl.setAttribute('required', 'required');
    } else {
      addressRow.style.display = 'none';
      addressEl.removeAttribute('required');
    }
  }

  qtyEl.addEventListener('change', () => {
    syncItems();
    recalc();
  });
  shippingEls.forEach((el) => el.addEventListener('change', recalc));

  // Initial render
  syncItems();
  recalc();

  function showMessage(type, text) {
    msgEl.className = 'form-message ' + type;
    msgEl.textContent = text;
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const qty = parseInt(qtyEl.value, 10) || 1;

    // Validate each item card
    for (let i = 0; i < qty; i++) {
      const dept = form[`item_${i}_department`].value;
      const engType = form.querySelector(`input[name="item_${i}_engraving_type"]:checked`);
      const engVal = form[`item_${i}_engraving_value`].value.trim();
      const avatarChoice = form.querySelector(`input[name="item_${i}_avatar_choice"]:checked`);
      const avatarFile = form[`item_${i}_avatar_file`].files[0];

      if (!dept) {
        showMessage('error', `Keychain #${i + 1}: please select a department.`);
        return;
      }
      if (!engType) {
        showMessage('error', `Keychain #${i + 1}: please choose an engraving type.`);
        return;
      }
      if (!engVal) {
        showMessage('error', `Keychain #${i + 1}: please enter the value to engrave.`);
        return;
      }
      if (!avatarChoice) {
        showMessage('error', `Keychain #${i + 1}: please choose an avatar.`);
        return;
      }
      if (avatarChoice.value === 'custom' && !avatarFile) {
        showMessage(
          'error',
          `Keychain #${i + 1}: you selected "Upload my own" — please attach your avatar image.`
        );
        return;
      }
    }

    // Payment slip required
    const slip = form.payment_slip.files[0];
    if (!slip) {
      showMessage('error', 'Please upload your payment slip.');
      return;
    }

    // File size sanity check (max 10 MB each)
    const maxSize = 10 * 1024 * 1024;
    if (slip.size > maxSize) {
      showMessage('error', 'Payment slip too large. Max 10 MB.');
      return;
    }
    for (let i = 0; i < qty; i++) {
      const f = form[`item_${i}_avatar_file`].files[0];
      if (f && f.size > maxSize) {
        showMessage('error', `Keychain #${i + 1}: avatar file too large. Max 10 MB.`);
        return;
      }
    }

    // Build multipart form data
    const fd = new FormData();
    fd.append('full_name', form.full_name.value.trim());
    fd.append('email', form.email.value.trim());
    fd.append('contact_number', form.contact_number.value.trim());
    fd.append('quantity', String(qty));
    fd.append('shipping_method', form.querySelector('input[name="shipping_method"]:checked').value);
    fd.append('mailing_address', form.mailing_address.value.trim());
    fd.append('notes', form.notes.value.trim());
    fd.append('payment_slip', slip);

    for (let i = 0; i < qty; i++) {
      fd.append(`item_${i}_department`, form[`item_${i}_department`].value);
      fd.append(
        `item_${i}_engraving_type`,
        form.querySelector(`input[name="item_${i}_engraving_type"]:checked`).value
      );
      fd.append(`item_${i}_engraving_value`, form[`item_${i}_engraving_value`].value.trim());
      fd.append(
        `item_${i}_avatar_choice`,
        form.querySelector(`input[name="item_${i}_avatar_choice"]:checked`).value
      );
      const af = form[`item_${i}_avatar_file`].files[0];
      if (af) fd.append(`item_${i}_avatar_file`, af);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'SUBMITTING…';
    msgEl.className = 'form-message';
    msgEl.textContent = '';

    try {
      const res = await fetch('/api/orders', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      showMessage(
        'success',
        'Order received! Reference: ' + data.order_id + '. We will contact you shortly to confirm.'
      );
      form.reset();
      syncItems();
      recalc();
    } catch (err) {
      showMessage('error', err.message || 'Something went wrong. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'SUBMIT ORDER';
    }
  });
})();
