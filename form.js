// Durible3D shared order form handler.
// Reads `data-product-type` and `data-unit-price` from the form element.
// Keychain form dynamically generates per-item cards; other products just
// collect their fields once.
(function () {
  const form = document.getElementById('orderForm');
  if (!form) return;

  const productType = form.dataset.productType;
  const UNIT = parseFloat(form.dataset.unitPrice || '0');
  const SHIPPING = 5;

  const qtyEl = document.getElementById('quantity');
  const itemsContainer = document.getElementById('items-container'); // keychain only
  const shippingEls = form.querySelectorAll('input[name="shipping_method"]');
  const addressRow = document.getElementById('address_row');
  const addressEl = document.getElementById('mailing_address');
  const unitEl = document.getElementById('unitTotal');
  const shippingEl = document.getElementById('shippingTotal');
  const grandEl = document.getElementById('grandTotal');
  const submitBtn = document.getElementById('submitBtn');
  const msgEl = document.getElementById('formMessage');

  const DEPARTMENTS = ['ECE', 'MEC', 'MCT', 'BTE', 'MME', 'CIVE', 'Do not include'];

  function fmt(n) {
    return 'RM ' + n.toFixed(2);
  }

  // ---------- Keychain per-item card builder ----------
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
        <label>Batch/Matric Number <span class="req">*</span></label>
        <input type="text" name="item_${index}_engraving_value" required placeholder="e.g. KOE 012 or 1912345">
      </div>

      <div class="form-row">
        <label>Personalise Avatar <span class="req">*</span></label>
        <div class="radio-group">
          <label class="rdo"><input type="radio" name="item_${index}_avatar_choice" value="male" required checked> Male avatar</label>
          <label class="rdo"><input type="radio" name="item_${index}_avatar_choice" value="female"> Female avatar</label>
          <label class="rdo"><input type="radio" name="item_${index}_avatar_choice" value="custom"> Upload my own</label>
        </div>
        <input type="file" name="item_${index}_avatar_file" accept="image/*" class="mt-8 file-input">
        <small>Upload only if you chose "Upload my own". Max 10 MB.</small>
      </div>
    `;
    return card;
  }

  function syncItems() {
    if (!itemsContainer) return;
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

    if (unitEl) unitEl.textContent = fmt(unitTotal);
    if (shippingEl) shippingEl.textContent = fmt(ship);
    if (grandEl) grandEl.textContent = fmt(grand);

    if (addressRow && addressEl) {
      if (shipping && shipping.value === 'standard') {
        addressRow.style.display = 'block';
        addressEl.setAttribute('required', 'required');
      } else {
        addressRow.style.display = 'none';
        addressEl.removeAttribute('required');
      }
    }
  }

  qtyEl.addEventListener('change', () => {
    if (productType === 'keychain') syncItems();
    recalc();
  });
  shippingEls.forEach((el) => el.addEventListener('change', recalc));

  // Initial render
  if (productType === 'keychain') syncItems();
  recalc();

  function showMessage(type, text) {
    msgEl.className = 'form-message ' + type;
    msgEl.textContent = text;
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Submit ----------
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const qty = parseInt(qtyEl.value, 10) || 1;
    const maxSize = 10 * 1024 * 1024;

    // Common validation
    const slip = form.payment_slip.files[0];
    if (!slip) return showMessage('error', 'Please upload your payment slip.');
    if (slip.size > maxSize)
      return showMessage('error', 'Payment slip too large. Max 10 MB.');

    // Product-specific validation
    if (productType === 'keychain') {
      for (let i = 0; i < qty; i++) {
        const dept = form[`item_${i}_department`].value;
        const engVal = form[`item_${i}_engraving_value`].value.trim();
        const avatarChoice = form.querySelector(
          `input[name="item_${i}_avatar_choice"]:checked`
        );
        const avatarFile = form[`item_${i}_avatar_file`].files[0];
        if (!dept)
          return showMessage('error', `Keychain #${i + 1}: please select a department.`);
        if (!engVal)
          return showMessage(
            'error',
            `Keychain #${i + 1}: please enter the Batch/Matric number.`
          );
        if (!avatarChoice)
          return showMessage('error', `Keychain #${i + 1}: please choose an avatar.`);
        if (avatarChoice.value === 'custom' && !avatarFile)
          return showMessage(
            'error',
            `Keychain #${i + 1}: you chose "Upload my own" — please attach your avatar image.`
          );
        if (avatarFile && avatarFile.size > maxSize)
          return showMessage('error', `Keychain #${i + 1}: avatar file too large.`);
      }
    } else if (productType === 'bizcard') {
      if (!form.email.value.trim().includes('@'))
        return showMessage('error', 'Please enter a valid email.');
      if (!form.company_address.value.trim())
        return showMessage('error', 'Company address is required.');
    } else if (productType === 'cablewinder') {
      const logo = form.logo_file.files[0];
      if (!logo) return showMessage('error', 'Please upload your logo.');
      if (logo.size > maxSize) return showMessage('error', 'Logo file too large. Max 10 MB.');
    }

    // Build FormData
    const fd = new FormData();
    fd.append('product_type', productType);
    fd.append('full_name', form.full_name.value.trim());
    fd.append('contact_number', form.contact_number.value.trim());
    if (form.email) fd.append('email', form.email.value.trim());
    fd.append('quantity', String(qty));
    fd.append(
      'shipping_method',
      form.querySelector('input[name="shipping_method"]:checked').value
    );
    fd.append('mailing_address', form.mailing_address ? form.mailing_address.value.trim() : '');
    fd.append('notes', form.notes ? form.notes.value.trim() : '');
    fd.append('payment_slip', slip);

    if (productType === 'keychain') {
      for (let i = 0; i < qty; i++) {
        fd.append(`item_${i}_department`, form[`item_${i}_department`].value);
        fd.append(
          `item_${i}_engraving_value`,
          form[`item_${i}_engraving_value`].value.trim()
        );
        fd.append(
          `item_${i}_avatar_choice`,
          form.querySelector(`input[name="item_${i}_avatar_choice"]:checked`).value
        );
        const af = form[`item_${i}_avatar_file`].files[0];
        if (af) fd.append(`item_${i}_avatar_file`, af);
      }
    } else if (productType === 'bizcard') {
      fd.append('company_address', form.company_address.value.trim());
    } else if (productType === 'cablewinder') {
      fd.append('logo_file', form.logo_file.files[0]);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
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
      if (productType === 'keychain') syncItems();
      recalc();
    } catch (err) {
      showMessage('error', err.message || 'Something went wrong. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit order';
    }
  });
})();
