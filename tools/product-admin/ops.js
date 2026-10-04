// SOFRACOM Operations (local admin tool): orders, quotes, reviews, customers, devices.
// All data comes from /api/ops/*, which runs the website's shared server functions with
// the Firebase Admin SDK. Customer-supplied text is always HTML-escaped before rendering.
(() => {
  const panel = document.getElementById('panel');
  const toast = document.getElementById('toast');
  let currentTab = 'orders';
  let codeTimer = null;
  let codePoll = null;

  const STATUSES = {
    orders: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    quotes: ['received', 'in_review', 'quoted', 'accepted', 'declined', 'completed'],
  };
  const LABELS = {
    pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'Out for delivery',
    delivered: 'Delivered', cancelled: 'Cancelled', received: 'Received', in_review: 'In review',
    quoted: 'Quote sent', accepted: 'Accepted', declined: 'Declined', completed: 'Completed',
  };
  const TONE = {
    delivered: 'badge-good', completed: 'badge-good', accepted: 'badge-good',
    cancelled: 'badge-bad', declined: 'badge-bad', pending: 'badge-wait', received: 'badge-wait',
  };

  const esc = value =>
    String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const shortId = id => String(id || '').slice(0, 8).toUpperCase();
  const date = value => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const money = value => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(Number(value) || 0);
  const badge = (status, label = LABELS[status] || status) => `<span class="badge ${TONE[status] || ''}">${esc(label)}</span>`;

  function notify(message, isError = false) {
    toast.textContent = message;
    toast.className = `toast show${isError ? ' error' : ''}`;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => (toast.className = 'toast'), 3500);
  }

  async function api(path, body) {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}` }));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  }

  // ---------- target banner ----------
  async function showTarget() {
    const banner = document.getElementById('targetBanner');
    try {
      const target = await api('/api/ops/target');
      if (target.mode === 'production') {
        banner.className = 'target-banner target-production';
        banner.textContent = `PRODUCTION · ${target.projectId} — changes affect real customers`;
      } else {
        banner.className = 'target-banner target-emulator';
        banner.textContent = `EMULATOR · ${target.projectId} — local test data`;
      }
      document.title = `${target.mode === 'production' ? '🔴 PROD' : '🟢 EMU'} · SOFRACOM Operations`;
    } catch (err) {
      banner.className = 'target-banner target-unknown';
      banner.textContent = `Firebase not available: ${err.message}`;
    }
  }

  // ---------- orders & quotes ----------
  async function renderRecords(kind, filter = '') {
    panel.innerHTML = `<div class="card"><div class="toolbar">
        <label class="field">Filter by status
          <select id="filter"><option value="">All</option>${STATUSES[kind]
            .map(s => `<option value="${s}" ${s === filter ? 'selected' : ''}>${LABELS[s]}</option>`)
            .join('')}</select></label>
        <button class="btn" id="reload" type="button">Refresh</button></div>
        <div id="list" class="muted">Loading…</div></div>`;
    document.getElementById('filter').onchange = event => renderRecords(kind, event.target.value);
    document.getElementById('reload').onclick = () => renderRecords(kind, filter);
    const list = document.getElementById('list');
    try {
      const { items } = await api(`/api/ops/${kind}${filter ? `?status=${filter}` : ''}`);
      if (!items.length) {
        list.textContent = 'Nothing to show.';
        return;
      }
      list.className = '';
      list.innerHTML = `<table><thead><tr><th>Ref / date</th><th>Customer</th><th>${kind === 'orders' ? 'Total' : 'Subject'}</th><th>Status</th><th>Change status</th></tr></thead><tbody>${items
        .map(item => `<tr data-id="${esc(item.id)}">
          <td><strong>#${esc(shortId(item.id))}</strong><br><span class="muted">${esc(date(item.created_at))}</span></td>
          <td>${esc(item.customer_name)}<br><span class="muted">${esc(item.customer_phone)}</span>
              ${item.email || item.customer_email ? `<br><span class="muted">${esc(item.email || item.customer_email)}</span>` : ''}
              ${item.uid ? '<br><span class="badge">has account</span>' : ''}</td>
          <td>${kind === 'orders' ? esc(money(item.total)) : esc(item.subject || '—')}
              <details><summary>Details</summary>${detailsHtml(kind, item)}</details></td>
          <td>${badge(item.status)}</td>
          <td><div class="editor">
              <select class="status">${STATUSES[kind].map(s => `<option value="${s}" ${s === item.status ? 'selected' : ''}>${LABELS[s]}</option>`).join('')}</select>
              <input class="note" maxlength="500" placeholder="Note for the customer (optional)">
              <button class="btn btn-primary btn-small save" type="button">Update</button></div></td></tr>`)
        .join('')}</tbody></table>`;
      list.querySelectorAll('tr[data-id]').forEach(row => {
        row.querySelector('.save').onclick = async () => {
          const button = row.querySelector('.save');
          button.disabled = true;
          try {
            await api(`/api/ops/${kind}/status`, {
              id: row.dataset.id,
              status: row.querySelector('.status').value,
              note: row.querySelector('.note').value,
            });
            notify('Status updated');
            renderRecords(kind, filter);
          } catch (err) {
            notify(err.message, true);
            button.disabled = false;
          }
        };
      });
    } catch (err) {
      list.innerHTML = `<div class="notice notice-bad">${esc(err.message)}</div>`;
    }
  }

  function detailsHtml(kind, item) {
    const history = (item.statusHistory || [])
      .map(entry => `<li>${esc(date(entry.at))} · ${esc(LABELS[entry.status] || entry.status)}${entry.note ? ` — ${esc(entry.note)}` : ''}</li>`)
      .join('');
    if (kind === 'orders') {
      const lines = (item.items || [])
        .map(line => `<li>${esc(line.quantity)} × ${esc(line.title)}${line.variantLabel ? ` (${esc(line.variantLabel)})` : ''} · ${esc(money(line.lineTotal ?? (line.price || 0) * line.quantity))}</li>`)
        .join('');
      return `<p>${esc(item.customer_address)}</p>${item.customer_notes ? `<p class="muted">${esc(item.customer_notes)}</p>` : ''}<ul>${lines}</ul><ol class="muted">${history}</ol>`;
    }
    return `<p style="white-space:pre-line">${esc(item.details)}</p><ol class="muted">${history}</ol>`;
  }

  // ---------- reviews ----------
  async function renderReviews(filter = '') {
    panel.innerHTML = `<div class="card"><div class="toolbar">
        <label class="field">Filter<select id="filter"><option value="">All</option>
          <option value="published" ${filter === 'published' ? 'selected' : ''}>Published</option>
          <option value="hidden" ${filter === 'hidden' ? 'selected' : ''}>Hidden</option></select></label>
        <button class="btn" id="reload" type="button">Refresh</button></div><div id="list" class="muted">Loading…</div></div>`;
    document.getElementById('filter').onchange = event => renderReviews(event.target.value);
    document.getElementById('reload').onclick = () => renderReviews(filter);
    const list = document.getElementById('list');
    try {
      const { items } = await api(`/api/ops/reviews${filter ? `?status=${filter}` : ''}`);
      if (!items.length) {
        list.textContent = 'No reviews.';
        return;
      }
      list.className = '';
      list.innerHTML = `<table><thead><tr><th>Date</th><th>Product</th><th>Review</th><th>Status</th><th></th></tr></thead><tbody>${items
        .map(review => `<tr data-id="${esc(review.id)}" data-status="${esc(review.status)}">
          <td class="muted">${esc(date(review.updatedAt))}</td>
          <td>${esc(review.productTitle)}</td>
          <td><strong>${esc(review.displayName)}</strong> · ${'★'.repeat(Number(review.rating) || 0)}${'☆'.repeat(5 - (Number(review.rating) || 0))}
              ${review.comment ? `<p style="white-space:pre-line;margin:0.3rem 0 0">${esc(review.comment)}</p>` : ''}</td>
          <td>${review.status === 'hidden' ? badge('declined', 'Hidden') : badge('completed', 'Published')}</td>
          <td><button class="btn btn-small ${review.status === 'hidden' ? '' : 'btn-danger'} toggle" type="button">${review.status === 'hidden' ? 'Unhide' : 'Hide'}</button></td></tr>`)
        .join('')}</tbody></table>`;
      list.querySelectorAll('tr[data-id]').forEach(row => {
        row.querySelector('.toggle').onclick = async () => {
          try {
            await api('/api/ops/reviews/status', {
              id: row.dataset.id,
              status: row.dataset.status === 'hidden' ? 'published' : 'hidden',
            });
            notify('Review updated; product rating recalculated');
            renderReviews(filter);
          } catch (err) {
            notify(err.message, true);
          }
        };
      });
    } catch (err) {
      list.innerHTML = `<div class="notice notice-bad">${esc(err.message)}</div>`;
    }
  }

  // ---------- customers ----------
  async function renderUsers(query = '') {
    panel.innerHTML = `<div class="card"><form class="toolbar" id="searchForm">
        <label class="field" style="flex:1 1 18rem">Search customers<input id="q" value="${esc(query)}" placeholder="Phone (any format), email or name"></label>
        <button class="btn btn-primary" type="submit">Search</button></form><div id="list" class="muted">Loading…</div></div>`;
    document.getElementById('searchForm').onsubmit = event => {
      event.preventDefault();
      renderUsers(document.getElementById('q').value);
    };
    const list = document.getElementById('list');
    try {
      const { users } = await api(`/api/ops/users?q=${encodeURIComponent(query)}`);
      if (!users.length) {
        list.textContent = 'No customer found.';
        return;
      }
      list.className = '';
      list.innerHTML = `<table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Signs in with</th><th>Created</th><th></th></tr></thead><tbody>${users
        .map(user => `<tr><td>${esc(user.name || '—')}</td><td>${esc(user.phoneDisplay || '—')}</td><td>${esc(user.email || '—')}</td>
          <td>${user.accountType === 'phone' ? 'Phone' : user.providers.includes('google.com') ? 'Google / email' : 'Email'}</td>
          <td class="muted">${esc(date(user.createdAt))}</td>
          <td><button class="btn btn-small open" data-uid="${esc(user.uid)}" type="button">Open</button></td></tr>`)
        .join('')}</tbody></table>`;
      list.querySelectorAll('.open').forEach(button => (button.onclick = () => renderUser(button.dataset.uid, query)));
    } catch (err) {
      list.innerHTML = `<div class="notice notice-bad">${esc(err.message)}</div>`;
    }
  }

  async function renderUser(uid, backQuery) {
    panel.innerHTML = `<div class="card"><button class="btn btn-small" id="back" type="button">← Back to customers</button><div id="detail" class="muted" style="margin-top:1rem">Loading…</div></div>`;
    document.getElementById('back').onclick = () => renderUsers(backQuery);
    const detail = document.getElementById('detail');
    try {
      const { user, orders, quotes } = await api(`/api/ops/user?uid=${encodeURIComponent(uid)}`);
      const canReset = user.providers.includes('password');
      detail.className = '';
      detail.innerHTML = `<h2 style="margin:0">${esc(user.name || '—')}</h2>
        <p class="muted">${user.accountType === 'phone' ? 'Signs in with a phone number' : 'Signs in with an email address'}</p>
        <p>Phone: ${esc(user.phoneDisplay || '—')}<br>Email: ${esc(user.email || '—')}${user.emailVerified ? ' <span class="badge badge-good">verified</span>' : ''}<br>
        <span class="muted">Created ${esc(date(user.createdAt))} · last sign-in ${esc(date(user.lastSignInAt))}</span></p>
        <div id="passwordBox">${canReset
          ? `<button class="btn" id="tempPw" type="button">Set temporary password</button>${user.mustChangePassword ? ' <span class="muted">Waiting for the customer to change the temporary password.</span>' : ''}`
          : '<p class="muted">Signs in with Google: no password to reset.</p>'}</div>
        <h3>Orders (${orders.length})</h3>
        ${orders.length
          ? `<table><thead><tr><th>Ref / date</th><th>Total</th><th>Status</th></tr></thead><tbody>${orders
              .map(order => `<tr><td><strong>#${esc(shortId(order.id))}</strong><br><span class="muted">${esc(date(order.created_at))}</span></td><td>${esc(money(order.total))}</td><td>${badge(order.status)}</td></tr>`)
              .join('')}</tbody></table>`
          : '<p class="muted">No orders.</p>'}
        ${quotes.length ? `<h3>Quotes (${quotes.length})</h3><ul>${quotes.map(quote => `<li>#${esc(shortId(quote.id))} ${esc(quote.subject || '')} ${badge(quote.status)}</li>`).join('')}</ul>` : ''}`;
      const tempButton = document.getElementById('tempPw');
      if (tempButton) {
        tempButton.onclick = () => {
          const box = document.getElementById('passwordBox');
          box.innerHTML = `<div class="notice notice-warn">This replaces the customer's password and signs them out everywhere.
            <div style="margin-top:0.6rem"><button class="btn btn-danger" id="confirmPw" type="button">Yes, set a temporary password</button>
            <button class="btn" id="cancelPw" type="button">Cancel</button></div></div>`;
          document.getElementById('cancelPw').onclick = () => renderUser(uid, backQuery);
          document.getElementById('confirmPw').onclick = async () => {
            try {
              const { password } = await api('/api/ops/users/temp-password', { uid });
              box.innerHTML = `<div class="notice notice-warn"><strong>Temporary password (shown only once)</strong>
                <div class="code" style="font-size:2rem;letter-spacing:0.1em">${esc(password)}</div>
                Give it to the customer after checking it is them. They must choose a new password when they sign in.</div>`;
            } catch (err) {
              box.innerHTML = `<div class="notice notice-bad">${esc(err.message)}</div>`;
            }
          };
        };
      }
    } catch (err) {
      detail.innerHTML = `<div class="notice notice-bad">${esc(err.message)}</div>`;
    }
  }

  // ---------- devices ----------
  function stopCodeTimers() {
    clearInterval(codeTimer);
    clearInterval(codePoll);
    codeTimer = null;
    codePoll = null;
  }

  async function renderDevices(issued = null) {
    stopCodeTimers();
    panel.innerHTML = `<div class="card"><div class="toolbar" style="justify-content:space-between;align-items:center">
        <div><h2 style="margin:0">Staff phones</h2><p class="muted" style="margin:0.25rem 0 0">Add a device, then type the 6-digit code in the SOFRACOM Admin app within 15 minutes. Each code works once.</p></div>
        <button class="btn btn-primary" id="addDevice" type="button">${issued ? 'Generate a new code' : 'Add device'}</button></div>
        <div id="codeArea"></div></div>
        <div class="card"><div class="toolbar" style="justify-content:space-between"><h2 style="margin:0">Enrolled devices</h2>
        <button class="btn" id="reload" type="button">Refresh</button></div><div id="list" class="muted">Loading…</div></div>`;
    document.getElementById('addDevice').onclick = async () => {
      try {
        renderDevices(await api('/api/ops/devices/code', {}));
      } catch (err) {
        notify(err.message, true);
      }
    };
    document.getElementById('reload').onclick = () => renderDevices(issued);
    await loadDevices(issued);
    if (issued) {
      // Show the countdown and poll until the code is used, expires or is burned.
      codeTimer = setInterval(() => showCode(issued), 1000);
      codePoll = setInterval(() => loadDevices(issued), 5000);
    }
  }

  let lastCodeStatus = null;

  function showCode(issued) {
    const area = document.getElementById('codeArea');
    if (!area) return stopCodeTimers();
    const secondsLeft = Math.max(0, Math.floor((Date.parse(issued.expiresAt) - Date.now()) / 1000));
    const status = lastCodeStatus?.status;
    if (status === 'active' && secondsLeft > 0) {
      area.innerHTML = `<div class="code">${esc(issued.code)}</div><p class="muted" style="text-align:center">Expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}</p>`;
      return;
    }
    stopCodeTimers();
    if (status === 'used') area.innerHTML = '<div class="notice notice-good">Code used: the device is enrolled.</div>';
    else if (status === 'burned') area.innerHTML = '<div class="notice notice-warn">Code expired or invalidated after too many wrong attempts. Generate a new one.</div>';
    else area.innerHTML = '<div class="notice notice-warn">Code expired or invalidated. Generate a new one.</div>';
  }

  async function loadDevices(issued) {
    const list = document.getElementById('list');
    if (!list) return;
    try {
      const { devices, code } = await api('/api/ops/devices');
      lastCodeStatus = code;
      if (issued) showCode(issued);
      else if (code?.status === 'burned') {
        document.getElementById('codeArea').innerHTML = '<div class="notice notice-warn">The last code was invalidated after too many wrong attempts. Generate a new one.</div>';
      }
      if (!devices.length) {
        list.textContent = 'No devices enrolled yet.';
        return;
      }
      list.className = '';
      list.innerHTML = `<table><thead><tr><th>Device</th><th>Enrolled</th><th>Last seen</th><th>Status</th><th></th></tr></thead><tbody>${devices
        .map(device => `<tr data-id="${esc(device.id)}"><td>${esc(device.name)}</td><td class="muted">${esc(date(device.createdAt))}</td>
          <td class="muted">${esc(date(device.lastSeenAt))}</td>
          <td>${device.active ? badge('completed', 'Active') : badge('cancelled', 'Revoked')}</td>
          <td class="actions">${device.active ? '<button class="btn btn-small btn-danger revoke" type="button">Revoke</button>' : ''}</td></tr>`)
        .join('')}</tbody></table>`;
      list.querySelectorAll('.revoke').forEach(button => {
        button.onclick = () => {
          const cell = button.parentElement;
          cell.innerHTML = '<button class="btn btn-small btn-danger yes" type="button">Yes, revoke</button> <button class="btn btn-small no" type="button">Cancel</button>';
          cell.querySelector('.no').onclick = () => loadDevices(issued);
          cell.querySelector('.yes').onclick = async () => {
            try {
              await api('/api/ops/devices/revoke', { id: cell.parentElement.dataset.id });
              notify('Device revoked');
              loadDevices(issued);
            } catch (err) {
              notify(err.message, true);
            }
          };
        };
      });
    } catch (err) {
      list.innerHTML = `<div class="notice notice-bad">${esc(err.message)}</div>`;
    }
  }

  // ---------- tabs ----------
  const RENDER = {
    orders: () => renderRecords('orders'),
    quotes: () => renderRecords('quotes'),
    reviews: () => renderReviews(),
    users: () => renderUsers(),
    devices: () => renderDevices(),
  };

  document.querySelectorAll('.ops-tabs button').forEach(button => {
    button.onclick = () => {
      stopCodeTimers();
      currentTab = button.dataset.tab;
      document.querySelectorAll('.ops-tabs button').forEach(b => b.classList.toggle('active', b === button));
      RENDER[currentTab]();
    };
  });

  showTarget();
  RENDER[currentTab]();
})();
