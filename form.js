// Ordo shared form handler.
// Handles two kinds of forms, discriminated by `data-form-type`:
//   - "order" (default): per-product PDP order form → POST /api/orders
//   - "pilot":           homepage Durible pilot lead form → POST /api/pilot
// For order forms, reads `data-product-type` and `data-unit-price` to drive
// totals; keychain quantity dynamically generates per-item cards.

(function () {
  // ---------- Order form (PDP) ----------
  var orderForm = document.getElementById('orderForm');
  if (orderForm && (orderForm.dataset.formType || 'order') === 'order') {
    setupOrderForm(orderForm);
  }

  // ---------- Pilot form (homepage Durible Lab) ----------
  var pilotForm = document.getElementById('pilotForm');
  if (pilotForm && pilotForm.dataset.formType === 'pilot') {
    setupPilotForm(pilotForm);
  }

  // ================================================================
  // ORDER FORM
  // ================================================================
  function setupOrderForm(form) {
    var productType = form.dataset.productType;
    var UNIT = parseFloat(form.dataset.unitPrice || '0');
    var SHIPPING = 5;

    var qtyEl = document.getElementById('quantity');
    var itemsContainer = document.getElementById('items-container'); // keychain only
    var shippingEls = form.querySelectorAll('input[name="shipping_method"]');
    var addressRow = document.getElementById('address_row');
    var addressEl = document.getElementById('mailing_address');
    var unitEl = document.getElementById('unitTotal');
    var shippingEl = document.getElementById('shippingTotal');
    var grandEl = document.getElementById('grandTotal');
    var payQrTotalEl = document.getElementById('payQrTotal');
    var submitBtn = document.getElementById('submitBtn');
    var msgEl = document.getElementById('formMessage');

    var DEPARTMENTS = ['ECE', 'MEC', 'MCT', 'BTE', 'MME', 'CIVE', 'Do not include'];

    function fmt(n) { return 'RM ' + n.toFixed(2); }

    function buildItemCard(index) {
      var card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.itemIndex = String(index);
      var displayNum = index + 1;
      card.innerHTML =
        '<div class="item-card-header">KEYCHAIN #' + displayNum + '</div>' +
        '<div class="form-row">' +
          '<label>Department <span class="req">*</span></label>' +
          '<select name="item_' + index + '_department" required>' +
            '<option value="">-- Select department --</option>' +
            DEPARTMENTS.map(function (d) { return '<option value="' + d + '">' + d + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div class="form-row">' +
          '<label>Batch/Matric Number <span class="req">*</span></label>' +
          '<input type="text" name="item_' + index + '_engraving_value" required placeholder="e.g. KOE 012 or 1912345">' +
        '</div>' +
        '<div class="form-row">' +
          '<label>Personalise Avatar <span class="req">*</span></label>' +
          '<div class="radio-group">' +
            '<label class="rdo"><input type="radio" name="item_' + index + '_avatar_choice" value="male" required checked> Male avatar</label>' +
            '<label class="rdo"><input type="radio" name="item_' + index + '_avatar_choice" value="female"> Female avatar</label>' +
            '<label class="rdo"><input type="radio" name="item_' + index + '_avatar_choice" value="custom"> Upload my own</label>' +
          '</div>' +
          '<input type="file" name="item_' + index + '_avatar_file" accept="image/*" class="mt-8 file-input">' +
          '<small>Upload only if you chose "Upload my own". Max 10 MB.</small>' +
        '</div>';
      return card;
    }

    function syncItems() {
      if (!itemsContainer) return;
      var qty = parseInt(qtyEl.value, 10) || 1;
      var existing = itemsContainer.children.length;
      if (qty > existing) {
        for (var i = existing; i < qty; i++) itemsContainer.appendChild(buildItemCard(i));
      } else if (qty < existing) {
        for (var j = existing - 1; j >= qty; j--) itemsContainer.removeChild(itemsContainer.children[j]);
      }
    }

    function recalc() {
      var qty = parseInt(qtyEl.value, 10) || 1;
      var shipping = form.querySelector('input[name="shipping_method"]:checked');
      var ship = shipping && shipping.value === 'standard' ? SHIPPING : 0;
      var unitTotal = qty * UNIT;
      var grand = unitTotal + ship;

      if (unitEl) unitEl.textContent = fmt(unitTotal);
      if (shippingEl) shippingEl.textContent = fmt(ship);
      if (grandEl) grandEl.textContent = fmt(grand);
      if (payQrTotalEl) payQrTotalEl.textContent = fmt(grand);

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

    qtyEl.addEventListener('change', function () {
      if (productType === 'keychain') syncItems();
      recalc();
    });
    shippingEls.forEach(function (el) { el.addEventListener('change', recalc); });

    if (productType === 'keychain') syncItems();
    recalc();

    function showMessage(type, text) {
      msgEl.className = 'form-message ' + type;
      msgEl.textContent = text;
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var qty = parseInt(qtyEl.value, 10) || 1;
      var maxSize = 10 * 1024 * 1024;

      var slip = form.payment_slip.files[0];
      if (!slip) return showMessage('error', 'Please upload your payment slip.');
      if (slip.size > maxSize) return showMessage('error', 'Payment slip too large. Max 10 MB.');

      if (productType === 'keychain') {
        for (var i = 0; i < qty; i++) {
          var dept = form['item_' + i + '_department'].value;
          var engVal = form['item_' + i + '_engraving_value'].value.trim();
          var avatarChoice = form.querySelector('input[name="item_' + i + '_avatar_choice"]:checked');
          var avatarFile = form['item_' + i + '_avatar_file'].files[0];
          if (!dept) return showMessage('error', 'Keychain #' + (i + 1) + ': please select a department.');
          if (!engVal) return showMessage('error', 'Keychain #' + (i + 1) + ': please enter the Batch/Matric number.');
          if (!avatarChoice) return showMessage('error', 'Keychain #' + (i + 1) + ': please choose an avatar.');
          if (avatarChoice.value === 'custom' && !avatarFile)
            return showMessage('error', 'Keychain #' + (i + 1) + ': you chose "Upload my own" — please attach your avatar image.');
          if (avatarFile && avatarFile.size > maxSize)
            return showMessage('error', 'Keychain #' + (i + 1) + ': avatar file too large.');
        }
      } else if (productType === 'bizcard') {
        if (!form.email.value.trim().includes('@'))
          return showMessage('error', 'Please enter a valid email.');
        if (!form.company_address.value.trim())
          return showMessage('error', 'Company address is required.');
      } else if (productType === 'cablewinder') {
        var logo = form.logo_file.files[0];
        if (!logo) return showMessage('error', 'Please upload your logo.');
        if (logo.size > maxSize) return showMessage('error', 'Logo file too large. Max 10 MB.');
      }

      var fd = new FormData();
      fd.append('product_type', productType);
      fd.append('full_name', form.full_name.value.trim());
      fd.append('contact_number', form.contact_number.value.trim());
      if (form.email) fd.append('email', form.email.value.trim());
      fd.append('quantity', String(qty));
      fd.append('shipping_method', form.querySelector('input[name="shipping_method"]:checked').value);
      fd.append('mailing_address', form.mailing_address ? form.mailing_address.value.trim() : '');
      fd.append('notes', form.notes ? form.notes.value.trim() : '');
      fd.append('payment_slip', slip);

      if (productType === 'keychain') {
        for (var k = 0; k < qty; k++) {
          fd.append('item_' + k + '_department', form['item_' + k + '_department'].value);
          fd.append('item_' + k + '_engraving_value', form['item_' + k + '_engraving_value'].value.trim());
          fd.append('item_' + k + '_avatar_choice', form.querySelector('input[name="item_' + k + '_avatar_choice"]:checked').value);
          var af = form['item_' + k + '_avatar_file'].files[0];
          if (af) fd.append('item_' + k + '_avatar_file', af);
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
        var res = await fetch('/api/orders', { method: 'POST', body: fd });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Submission failed.');
        showMessage('success', 'Order received! Reference: ' + data.order_id + '. We will contact you shortly to confirm.');
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
  }

  // ================================================================
  // PILOT FORM (Durible)
  // ================================================================
  function setupPilotForm(form) {
    var submitBtn = document.getElementById('pilotSubmitBtn');
    var msgEl = document.getElementById('pilotFormMessage');

    function show(type, text) {
      msgEl.className = 'form-message ' + type;
      msgEl.textContent = text;
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var company = form.company_name.value.trim();
      var contact = form.contact_name.value.trim();
      var email = form.email.value.trim();
      var phone = form.phone.value.trim();
      var useCase = form.use_case.value.trim();
      var notes = form.notes ? form.notes.value.trim() : '';

      if (!company) return show('error', 'Company / organisation is required.');
      if (!contact) return show('error', 'Contact name is required.');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return show('error', 'Please enter a valid email.');
      if (!phone) return show('error', 'Phone number is required.');
      if (!useCase) return show('error', 'Please describe your use case briefly.');

      var payload = {
        company_name: company,
        contact_name: contact,
        email: email,
        phone: phone,
        use_case: useCase,
        notes: notes,
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
      msgEl.className = 'form-message';
      msgEl.textContent = '';

      try {
        var res = await fetch('/api/pilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Submission failed.');
        show('success', 'Application received. Reference: ' + data.pilot_id + '. We will be in touch shortly.');
        form.reset();
      } catch (err) {
        show('error', err.message || 'Something went wrong. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Apply to pilot Durible';
      }
    });
  }
})();
