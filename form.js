// Durible3D order form handler
(function () {
  const form = document.getElementById('orderForm');
  if (!form) return;

  const qtyEl = document.getElementById('quantity');
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

  function fmt(n) {
    return 'RM ' + n.toFixed(2);
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

    // Toggle address row
    if (shipping && shipping.value === 'standard') {
      addressRow.style.display = 'block';
      addressEl.setAttribute('required', 'required');
    } else {
      addressRow.style.display = 'none';
      addressEl.removeAttribute('required');
    }
  }

  qtyEl.addEventListener('change', recalc);
  shippingEls.forEach((el) => el.addEventListener('change', recalc));
  recalc();

  function showMessage(type, text) {
    msgEl.className = 'form-message ' + type;
    msgEl.textContent = text;
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Basic validation for checkbox groups
    const depChecked = form.querySelectorAll('input[name="department"]:checked');
    const batchChecked = form.querySelectorAll('input[name="batch"]:checked');
    if (depChecked.length === 0) {
      showMessage('error', 'Please select at least one department (or choose "Do not include").');
      return;
    }
    if (batchChecked.length === 0 && !form.batch_other.value.trim()) {
      showMessage('error', 'Please select at least one batch number.');
      return;
    }

    // File size sanity check (max 10 MB each)
    const maxSize = 10 * 1024 * 1024;
    const avatar = form.avatar_file.files[0];
    const slip = form.payment_slip.files[0];
    if (avatar && avatar.size > maxSize) {
      showMessage('error', 'Avatar file too large. Max 10 MB.');
      return;
    }
    if (slip && slip.size > maxSize) {
      showMessage('error', 'Payment slip too large. Max 10 MB.');
      return;
    }

    // Build multipart form data
    const fd = new FormData();
    fd.append('full_name', form.full_name.value.trim());
    fd.append('email', form.email.value.trim());
    fd.append('contact_number', form.contact_number.value.trim());
    fd.append('departments', Array.from(depChecked).map((x) => x.value).join(','));
    fd.append(
      'batches',
      Array.from(batchChecked).map((x) => x.value).join(',') +
        (form.batch_other.value.trim() ? ',' + form.batch_other.value.trim() : '')
    );
    fd.append('avatar_choice', form.avatar_choice.value);
    fd.append('quantity', form.quantity.value);
    fd.append('shipping_method', form.querySelector('input[name="shipping_method"]:checked').value);
    fd.append('mailing_address', form.mailing_address.value.trim());
    fd.append('notes', form.notes.value.trim());
    if (avatar) fd.append('avatar_file', avatar);
    if (slip) fd.append('payment_slip', slip);

    submitBtn.disabled = true;
    submitBtn.textContent = 'SUBMITTING…';
    showMessage('', '');
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
      recalc();
    } catch (err) {
      showMessage('error', err.message || 'Something went wrong. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'SUBMIT ORDER';
    }
  });
})();
