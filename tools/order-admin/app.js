const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'treated', label: 'Treated' },
  { value: 'declined', label: 'Declined' },
];

function formatStatusLabel(value) {
  const normalized = String(value || 'unknown').toLowerCase();
  return normalized
    .split('_')
    .map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

function normalizeImagePath(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\.?\//, '')}`;
}

const ordersEl = document.querySelector('#orders');
const statusEl = document.querySelector('#status');
const emptyEl = document.querySelector('#empty');
const refreshOrdersBtn = document.querySelector('#refresh-orders');
const refreshQuotesBtn = document.querySelector('#refresh-quotes');
const filterEl = document.querySelector('#status-filter');
const quotesEl = document.querySelector('#quotes');
const quotesEmptyEl = document.querySelector('#quotes-empty');

const state = { orders: [], quotes: [], fetchingOrders: false, fetchingQuotes: false, filter: '' };

function populateFilterOptions() {
  if (!filterEl) return;
  // Avoid duplicates
  const existing = new Set();
  filterEl.innerHTML = '<option value="">All orders</option>';
  STATUS_OPTIONS.forEach(opt => {
    if (existing.has(opt.value)) return;
    existing.add(opt.value);
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    filterEl.appendChild(option);
  });
}

const STATUS_MESSAGES = {
  success: '✅ ',
  error: '⚠️ ',
};

function showStatus(message, type = 'success') {
  if (!statusEl) return;
  statusEl.textContent = `${STATUS_MESSAGES[type] || ''}${message}`;
  statusEl.className = `status-pill ${type}`;
  statusEl.classList.remove('hidden');
  setTimeout(() => statusEl?.classList.add('hidden'), 3500);
}

function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderOrders() {
  if (!ordersEl) return;
  ordersEl.innerHTML = '';
  if (!state.orders.length) {
    emptyEl?.classList.remove('hidden');
    return;
  }

  const visibleOrders = state.filter
    ? state.orders.filter(order => (order.status || '').toLowerCase() === state.filter)
    : state.orders;

  if (!visibleOrders.length) {
    emptyEl?.classList.remove('hidden');
    return;
  }

  emptyEl?.classList.add('hidden');

  visibleOrders.forEach(order => {
    const card = document.createElement('article');
    card.className = 'order-card';
    const normalizedStatus = (order.status || 'new').toLowerCase();
    card.classList.add(`status-${normalizedStatus}`);

    const header = document.createElement('header');
    const meta = document.createElement('div');
    meta.className = 'order-meta';
    meta.innerHTML = `
      <strong>${order.customer_name}</strong>
      <span>${order.customer_phone || 'No phone provided'}</span>
      <span>${order.customer_address || 'Address missing'}</span>
      <span>${formatDate(order.created_at)}</span>
    `;

    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = formatStatusLabel(order.status);

    header.appendChild(meta);
    header.appendChild(pill);
    card.appendChild(header);

    const items = document.createElement('ul');
    items.className = 'order-items';
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const orderCurrency = order.currency || 'TND';
    orderItems.forEach(item => {
      const row = document.createElement('li');
      row.className = 'order-item-row';

      const rawThumb =
        item.image || item.productImage || item.product_image || item.thumbnail || null;
      const thumbSrc = normalizeImagePath(rawThumb);
      if (thumbSrc) {
        const thumb = document.createElement('div');
        thumb.className = 'item-thumb';
        const thumbImg = document.createElement('img');
        thumbImg.src = thumbSrc;
        thumbImg.alt = item.title || 'Product image';
        thumbImg.loading = 'lazy';
        thumb.appendChild(thumbImg);
        row.appendChild(thumb);
      }

      const info = document.createElement('div');
      info.className = 'item-info';
      const title = document.createElement('strong');
      title.textContent = item.title || item.description || 'Product';
      info.appendChild(title);
      if (item.description) {
        const desc = document.createElement('span');
        desc.textContent = item.description;
        info.appendChild(desc);
      }

      const priceValue = Number(item.price) || 0;
      const quantity = item.quantity || 1;
      const priceBadge = document.createElement('span');
      priceBadge.className = 'item-price';
      priceBadge.textContent = `${quantity} × ${priceValue.toFixed(2)} ${orderCurrency}`;

      row.appendChild(info);
      row.appendChild(priceBadge);
      items.appendChild(row);
    });

    const totalValue = Number.isFinite(order.total)
      ? order.total
      : (Array.isArray(order.items)
          ? order.items.reduce((acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1), 0)
          : 0);
    const currency = order.currency || 'TND';
    const summary = document.createElement('div');
    summary.className = 'order-summary';
    summary.innerHTML = `
      <span>Total</span>
      <strong>${totalValue.toFixed(2)} ${currency}</strong>
    `;

    const actions = document.createElement('div');
    actions.className = 'order-actions';
    const select = document.createElement('select');
    STATUS_OPTIONS.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    });
    select.value = order.status && STATUS_OPTIONS.some(opt => opt.value === order.status)
      ? order.status
      : 'new';
    select.dataset.previous = select.value;

    const button = document.createElement('button');
    button.textContent = 'Update status';
    button.type = 'button';

    button.addEventListener('click', async () => {
      await performStatusUpdate(order.id, select, pill);
    });

    select.addEventListener('change', async () => {
      await performStatusUpdate(order.id, select, pill);
    });

    const notes = document.createElement('p');
    notes.className = 'note';
    notes.textContent = order.customer_notes || 'No notes provided';

    actions.appendChild(select);
    actions.appendChild(button);

    card.appendChild(items);
    card.appendChild(summary);
    card.appendChild(actions);
    card.appendChild(notes);

    ordersEl.appendChild(card);
  });
}

function renderQuotes() {
  if (!quotesEl) return;
  quotesEl.innerHTML = '';
  if (!state.quotes.length) {
    quotesEmptyEl?.classList.remove('hidden');
    return;
  }

  quotesEmptyEl?.classList.add('hidden');

  state.quotes.forEach(quote => {
    const card = document.createElement('article');
    card.className = 'quote-card';

    const header = document.createElement('header');
    const meta = document.createElement('div');
    meta.className = 'quote-meta';
    meta.innerHTML = `
      <span>${quote.customer_name || 'Guest'}</span>
      <span>${quote.customer_email || 'No email'}</span>
      <span>${quote.customer_phone || 'No phone provided'}</span>
    `;
    const statusBadge = document.createElement('span');
    statusBadge.className = 'pill';
    statusBadge.textContent = formatStatusLabel(quote.status);

    header.appendChild(meta);
    header.appendChild(statusBadge);

    const subject = document.createElement('p');
    subject.className = 'quote-details';
    subject.innerHTML = `<strong>${quote.subject || 'Project request'}</strong>`;
    const details = document.createElement('p');
    details.className = 'quote-details';
    details.textContent = quote.details || 'No message provided.';

    const created = document.createElement('small');
    created.textContent = formatDate(quote.created_at);

    card.appendChild(header);
    card.appendChild(subject);
    card.appendChild(details);
    card.appendChild(created);

    quotesEl.appendChild(card);
  });
}

async function performStatusUpdate(orderId, select, pill) {
  const desiredStatus = select.value;
  select.disabled = true;
  const previous = select.dataset.previous;
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: desiredStatus }),
    });
    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.error || 'Unable to update status');
    }
    select.dataset.previous = desiredStatus;
    pill.textContent = desiredStatus;
    showStatus(`Status of ${orderId} saved`, 'success');
  } catch (err) {
    select.value = previous;
    showStatus(err.message || 'Failed to update', 'error');
  } finally {
    select.disabled = false;
  }
}

async function refreshOrders() {
  if (state.fetchingOrders) return;
  state.fetchingOrders = true;
  refreshOrdersBtn?.setAttribute('disabled', 'disabled');
  try {
    const response = await fetch('/api/orders?limit=100');
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || 'Unable to fetch orders');
    state.orders = Array.isArray(payload.orders) ? payload.orders : [];
    renderOrders();
    showStatus('Order feed updated');
  } catch (err) {
    showStatus(err.message || 'Failed to load orders', 'error');
  } finally {
    state.fetchingOrders = false;
    refreshOrdersBtn?.removeAttribute('disabled');
  }
}

async function refreshQuotes() {
  if (state.fetchingQuotes) return;
  state.fetchingQuotes = true;
  refreshQuotesBtn?.setAttribute('disabled', 'disabled');
  try {
    const response = await fetch('/api/quotes?limit=100');
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || 'Unable to fetch quotes');
    state.quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
    renderQuotes();
  } catch (err) {
    showStatus(err.message || 'Failed to load quotes', 'error');
  } finally {
    state.fetchingQuotes = false;
    refreshQuotesBtn?.removeAttribute('disabled');
  }
}

filterEl?.addEventListener('change', () => {
  state.filter = filterEl.value;
  renderOrders();
});

refreshOrdersBtn?.addEventListener('click', refreshOrders);
refreshQuotesBtn?.addEventListener('click', refreshQuotes);
populateFilterOptions();
refreshOrders();
refreshQuotes();
